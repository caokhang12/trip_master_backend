import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItineraryRepository } from './itinerary.repository';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
import { ItineraryEntity } from 'src/schemas/itinerary.entity';

@Injectable()
export class ItineraryService {
  constructor(private readonly repo: ItineraryRepository) {}

  async create(
    userId: string,
    dto: CreateItineraryDto,
  ): Promise<ItineraryEntity> {
    const ok = await this.repo.tripOwnedByUser(dto.tripId, userId);
    if (!ok) throw new ForbiddenException('Trip not accessible');
    // If no date provided, but trip has startDate, compute date = startDate + (dayNumber - 1)
    let computedDate: Date | undefined = undefined;
    if (!dto.date) {
      const trip = await this.repo.getTripById(dto.tripId);
      if (trip?.startDate) {
        const d = new Date(trip.startDate);
        d.setDate(d.getDate() + (dto.dayNumber - 1));
        computedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      }
    }
    const created = await this.repo.create({
      tripId: dto.tripId,
      title: dto.title,
      notes: dto.notes,
      dayNumber: dto.dayNumber,
      date: dto.date ? (dto.date as unknown as Date) : computedDate,
      aiGenerated: dto.aiGenerated ?? false,
      userModified: dto.userModified ?? false,
      estimatedCost: dto.estimatedCost ?? 0,
      actualCost: dto.actualCost,
      costCurrency: dto.costCurrency ?? 'USD',
      costBreakdown: dto.costBreakdown,
    });
    return created;
  }

  async listForUser(
    userId: string,
    tripId?: string,
  ): Promise<ItineraryEntity[]> {
    return this.repo.listForUser(userId, tripId);
  }

  async getOne(userId: string, id: string): Promise<ItineraryEntity> {
    const found = await this.repo.findByIdForUser(id, userId);
    if (!found) throw new NotFoundException('Itinerary not found');
    return found;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateItineraryDto,
  ): Promise<ItineraryEntity> {
    const existing = await this.repo.findByIdForUser(id, userId);
    console.log('existing', existing);
    if (!existing) throw new NotFoundException('Itinerary not found');
    if (dto.tripId && dto.tripId !== existing.tripId) {
      const ok = await this.repo.tripOwnedByUser(dto.tripId, userId);
      if (!ok) throw new ForbiddenException('Trip not accessible');
    }

    // Determine target tripId and dayNumber for potential recompute
    const targetDayNumber = dto.dayNumber ?? existing.dayNumber;
    let nextDate: Date | undefined = existing.date;
    if (!dto.date) {
      const trip = await this.repo.getTripById(existing.tripId);
      if (trip?.startDate) {
        const d = new Date(trip.startDate);
        d.setDate(d.getDate() + (targetDayNumber - 1));
        nextDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      }
    } else {
      nextDate = dto.date as unknown as Date;
    }

    await this.repo.update(id, {
      tripId: dto.tripId ?? existing.tripId,
      title: dto.title ?? existing.title,
      notes: dto.notes ?? existing.notes,
      dayNumber: dto.dayNumber ?? existing.dayNumber,
      date: nextDate,
      aiGenerated: dto.aiGenerated ?? existing.aiGenerated,
      userModified: dto.userModified ?? existing.userModified,
      estimatedCost: dto.estimatedCost ?? existing.estimatedCost,
      actualCost: dto.actualCost ?? existing.actualCost,
      costCurrency: dto.costCurrency ?? existing.costCurrency,
      costBreakdown: dto.costBreakdown ?? existing.costBreakdown,
    });
    const updated = await this.repo.findById(id);
    return updated!;
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.repo.findByIdForUser(id, userId);
    if (!existing) throw new NotFoundException('Itinerary not found');
    await this.repo.remove(id);
  }
}
