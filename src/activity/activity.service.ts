import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityRepository } from './activity.repository';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityEntity } from 'src/schemas/activity.entity';
import { BulkCreateActivitiesDto } from './dto/bulk-create-activities.dto';

@Injectable()
export class ActivityService {
  constructor(private readonly repo: ActivityRepository) {}

  async create(
    userId: string,
    dto: CreateActivityDto,
  ): Promise<ActivityEntity> {
    const allowed = await this.repo.itineraryBelongsToUser(
      dto.itineraryId,
      userId,
    );
    if (!allowed)
      throw new ForbiddenException('Itinerary does not belong to user');

    const created = await this.repo.create({
      itineraryId: dto.itineraryId,
      time: dto.time,
      title: dto.title,
      description: dto.description,
      duration: dto.duration ?? null,
      cost: dto.cost ?? null,
      type: dto.type ?? null,
      orderIndex: dto.orderIndex ?? 0,
      metadata: dto.metadata ?? null,
    });

    if (dto.destinationIds && dto.destinationIds.length > 0) {
      await this.repo.replaceDestinationMappings(
        created.id,
        dto.destinationIds,
      );
    }
    return (await this.repo.findById(created.id))!;
  }

  async listForUser(
    userId: string,
    query: { itineraryId?: string; tripId?: string },
  ): Promise<ActivityEntity[]> {
    return this.repo.listForUser(userId, query);
  }

  async bulkCreate(
    userId: string,
    dto: BulkCreateActivitiesDto,
  ): Promise<ActivityEntity[]> {
    const allowed = await this.repo.itineraryBelongsToUser(
      dto.itineraryId,
      userId,
    );
    if (!allowed)
      throw new ForbiddenException('Itinerary does not belong to user');

    const items = dto.activities.map((a) => ({
      time: a.time,
      title: a.title,
      description: a.description,
      duration: a.duration ?? null,
      cost: a.cost ?? null,
      type: a.type ?? null,
      orderIndex: a.orderIndex ?? 0,
      metadata: a.metadata ?? null,
      destinationIds: a.destinationIds,
    }));
    return this.repo.bulkCreate(dto.itineraryId, items);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateActivityDto,
  ): Promise<ActivityEntity> {
    const allowed = await this.repo.activityOwnedByUser(id, userId);
    if (!allowed) throw new ForbiddenException('Activity not accessible');

    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Activity not found');

    // Prevent moving to another itinerary unless also belongs to user
    if (dto.itineraryId && dto.itineraryId !== existing.itineraryId) {
      const ok = await this.repo.itineraryBelongsToUser(
        dto.itineraryId,
        userId,
      );
      if (!ok) throw new ForbiddenException('Target itinerary not accessible');
    }

    await this.repo.update(id, {
      itineraryId: dto.itineraryId ?? existing.itineraryId,
      time: dto.time ?? existing.time,
      title: dto.title ?? existing.title,
      description: dto.description ?? existing.description,
      duration: dto.duration ?? existing.duration ?? null,
      cost: dto.cost ?? existing.cost ?? null,
      type: dto.type ?? existing.type ?? null,
      orderIndex: dto.orderIndex ?? existing.orderIndex,
      metadata: dto.metadata ?? existing.metadata ?? null,
    });

    if (dto.destinationIds) {
      await this.repo.replaceDestinationMappings(id, dto.destinationIds);
    }

    const updated = await this.repo.findById(id);
    return updated!;
  }

  async remove(userId: string, id: string): Promise<void> {
    const allowed = await this.repo.activityOwnedByUser(id, userId);
    if (!allowed) throw new ForbiddenException('Activity not accessible');
    await this.repo.remove(id);
  }
}
