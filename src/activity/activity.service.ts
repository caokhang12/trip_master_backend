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
import { BulkUpdateActivitiesDto } from './dto/bulk-update-activities.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DestinationEntity } from 'src/schemas/destination.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class ActivityService {
  constructor(
    private readonly repo: ActivityRepository,
    @InjectRepository(DestinationEntity)
    private readonly destinationRepo: Repository<DestinationEntity>,
  ) {}

  private stripPoiFromMetadata(
    metadata: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> | null | undefined {
    if (!metadata) return metadata;
    if (!('poi' in metadata)) return metadata;
    const { poi: _poi, ...rest } = metadata;
    void _poi;
    return rest;
  }

  private async ensureDestinationsExist(ids?: string[]) {
    if (!ids || ids.length === 0) return;
    const uniqueIds = Array.from(new Set(ids));
    const count = await this.destinationRepo.count({
      where: { id: In(uniqueIds) },
    });
    if (count !== uniqueIds.length) {
      throw new NotFoundException('One or more destinations not found');
    }
  }

  async create(
    userId: string,
    dto: CreateActivityDto,
  ): Promise<ActivityEntity> {
    const ownedItinerary = await this.repo.findOwnedItineraryById(
      dto.itineraryId,
      userId,
    );
    if (!ownedItinerary)
      throw new ForbiddenException('Itinerary does not belong to user');

    await this.ensureDestinationsExist(dto.destinationIds);

    const poi = dto.poi ?? null;
    const cleanedMetadata = this.stripPoiFromMetadata(dto.metadata ?? null);

    const created = await this.repo.create({
      itineraryId: dto.itineraryId,
      time: dto.time,
      title: dto.title,
      description: dto.description,
      duration: dto.duration ?? null,
      cost: dto.cost ?? null,
      type: dto.type ?? null,
      orderIndex: dto.orderIndex ?? 0,
      poi,
      metadata: cleanedMetadata ?? null,
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
    const ownedItinerary = await this.repo.findOwnedItineraryById(
      dto.itineraryId,
      userId,
    );
    if (!ownedItinerary)
      throw new ForbiddenException('Itinerary does not belong to user');

    const allDestinationIds = dto.activities
      .flatMap((a) => a.destinationIds || [])
      .filter(Boolean);
    await this.ensureDestinationsExist(allDestinationIds);

    const items = dto.activities.map((a) => {
      const cleanedMetadata = this.stripPoiFromMetadata(a.metadata ?? null);
      return {
        time: a.time,
        title: a.title,
        description: a.description,
        duration: a.duration ?? null,
        cost: a.cost ?? null,
        type: a.type ?? null,
        orderIndex: a.orderIndex ?? 0,
        poi: a.poi ?? null,
        metadata: cleanedMetadata ?? null,
        destinationIds: a.destinationIds,
      };
    });
    return this.repo.bulkCreate(dto.itineraryId, items);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateActivityDto,
  ): Promise<ActivityEntity> {
    const existing = await this.repo.findOwnedActivityById(id, userId);
    if (!existing) throw new ForbiddenException('Activity not accessible');

    // Prevent moving to another itinerary unless also belongs to user
    if (dto.itineraryId && dto.itineraryId !== existing.itineraryId) {
      const ownedTargetItinerary = await this.repo.findOwnedItineraryById(
        dto.itineraryId,
        userId,
      );
      if (!ownedTargetItinerary)
        throw new ForbiddenException('Target itinerary not accessible');
    }

    if (dto.destinationIds) {
      await this.ensureDestinationsExist(dto.destinationIds);
    }

    const nextMetadata = (dto.metadata ?? existing.metadata ?? null) as Record<
      string,
      unknown
    > | null;

    const nextPoi = dto.poi !== undefined ? dto.poi : existing.poi;

    const cleanedMetadata = this.stripPoiFromMetadata(nextMetadata);

    await this.repo.update(id, {
      itineraryId: dto.itineraryId ?? existing.itineraryId,
      time: dto.time ?? existing.time,
      title: dto.title ?? existing.title,
      description: dto.description ?? existing.description,
      duration: dto.duration ?? existing.duration ?? null,
      cost: dto.cost ?? existing.cost ?? null,
      type: dto.type ?? existing.type ?? null,
      orderIndex: dto.orderIndex ?? existing.orderIndex,
      poi: nextPoi ?? null,
      metadata: cleanedMetadata ?? null,
    });

    if (dto.destinationIds) {
      await this.repo.replaceDestinationMappings(id, dto.destinationIds);
    }

    const updated = await this.repo.findById(id);
    return updated!;
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.repo.findOwnedActivityById(id, userId);
    if (!existing) throw new ForbiddenException('Activity not accessible');
    await this.repo.remove(id);
  }

  /**
   * Bulk update activities - optimized for reorder/move operations
   * All activities must belong to user, all target itineraries must belong to user
   */
  async bulkUpdate(
    userId: string,
    dto: BulkUpdateActivitiesDto,
  ): Promise<{ success: boolean; updatedIds: string[] }> {
    const activityIds = dto.activities.map((a) => a.id);

    // Validate all activities belong to user
    const activitiesOwned = await this.repo.activitiesOwnedByUser(
      activityIds,
      userId,
    );
    if (!activitiesOwned) {
      throw new ForbiddenException('One or more activities not accessible');
    }

    // Validate all target itineraries belong to user
    const targetItineraryIds = dto.activities
      .map((a) => a.itineraryId)
      .filter((id): id is string => id !== undefined);
    if (targetItineraryIds.length > 0) {
      const uniqueItineraryIds = [...new Set(targetItineraryIds)];
      const itinerariesOwned = await this.repo.itinerariesBelongToUser(
        uniqueItineraryIds,
        userId,
      );
      if (!itinerariesOwned) {
        throw new ForbiddenException(
          'One or more target itineraries not accessible',
        );
      }
    }

    // Perform bulk update in transaction
    const updatedIds = await this.repo.bulkUpdate(dto.activities);

    return { success: true, updatedIds };
  }
}
