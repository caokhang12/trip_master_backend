import { Injectable, NotFoundException } from '@nestjs/common';
import { TripEntity } from '../schemas/trip.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { PaginationHelper, Paged } from '../shared/types/pagination';
import { TripStatus } from './enum/trip-enum';
import { TripRepository } from './trip.repository';
import { TripListResponseDto } from 'src/trip/dto/trip-response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DestinationEntity } from 'src/schemas/destination.entity';
import { ItineraryRepository } from 'src/itinerary/itinerary.repository';
import { ActivityRepository } from 'src/activity/activity.repository';

@Injectable()
export class TripService {
  constructor(
    private readonly tripRepo: TripRepository,
    @InjectRepository(DestinationEntity)
    private readonly destinationRepo: Repository<DestinationEntity>,
    private readonly itineraryRepo: ItineraryRepository,
    private readonly activityRepo: ActivityRepository,
  ) {}

  async create(userId: string, dto: CreateTripDto): Promise<TripEntity> {
    // Attempt to resolve a primary destination if frontend provided a placeId
    let primaryDestinationId: string | undefined = undefined;
    // If client explicitly provided an existing destination id, use it
    if (dto.primaryDestinationId) {
      primaryDestinationId = dto.primaryDestinationId;
    } else if (dto.destinationLocation?.placeId) {
      const found = await this.destinationRepo.findOne({
        where: { placeId: dto.destinationLocation.placeId },
      });
      if (found) {
        primaryDestinationId = found.id;
      } else {
        // Create new destination from location data
        // Parse country from address (simple heuristic - last part after comma)
        const addressParts = dto.destinationLocation.address.split(',');
        const country =
          addressParts[addressParts.length - 1]?.trim() || 'Unknown';

        const newDest = this.destinationRepo.create({
          placeId: dto.destinationLocation.placeId,
          name: dto.destinationLocation.name,
          country: country,
          countryCode: 'XX', // Default - should be enhanced with geocoding
          city: dto.destinationLocation.name,
          coordinates: `POINT(${dto.destinationLocation.lng} ${dto.destinationLocation.lat})`,
        });
        const savedDest = await this.destinationRepo.save(newDest);
        primaryDestinationId = savedDest.id;
      }
    }

    const entity = await this.tripRepo.createTrip({
      userId,
      title: dto.title,
      description: dto.description,
      timezone: dto.timezone,
      primaryDestinationId: primaryDestinationId,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      budget: dto.budget,
      currency: dto.currency ?? 'USD',
      status: dto.status ?? TripStatus.PLANNING,
      isPublic: dto.isPublic ?? false,
      enableCostTracking: dto.enableCostTracking ?? true,
    });

    // Create itineraries and activities if provided
    if (
      dto.itineraries &&
      Array.isArray(dto.itineraries) &&
      dto.itineraries.length > 0
    ) {
      for (const itinInput of dto.itineraries) {
        const itinerary = await this.itineraryRepo.create({
          tripId: entity.id,
          title: itinInput.title,
          notes: itinInput.notes,
          dayNumber: itinInput.dayNumber,
          date: itinInput.date ? new Date(itinInput.date) : undefined,
          aiGenerated: false,
          userModified: false,
        });

        // Create activities for this itinerary
        if (
          itinInput.activities &&
          Array.isArray(itinInput.activities) &&
          itinInput.activities.length > 0
        ) {
          for (const actInput of itinInput.activities) {
            await this.activityRepo.create({
              itineraryId: itinerary.id,
              time: actInput.time,
              title: actInput.title,
              description: actInput.description,
              duration: actInput.duration,
              cost: actInput.cost,
              type: actInput.type,
              orderIndex: actInput.orderIndex ?? 0,
            });
          }
        }
      }
    }

    return entity;
  }

  async findOneForUser(id: string, userId: string): Promise<TripEntity> {
    const found = await this.tripRepo.findByIdForUser(id, userId);
    if (!found) throw new NotFoundException('Trip not found');
    return found;
  }

  async findOneAdmin(id: string): Promise<TripEntity> {
    const found = await this.tripRepo.findById(id);
    if (!found) throw new NotFoundException('Trip not found');
    return found;
  }

  async updateForUser(
    id: string,
    userId: string,
    dto: UpdateTripDto,
  ): Promise<TripEntity> {
    const existing = await this.findOneForUser(id, userId);

    const patched: Partial<TripEntity> = {
      ...existing,
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : existing.endDate,
    };
    await this.tripRepo.updateTrip(id, patched);
    return (await this.tripRepo.findById(id))!;
  }

  async updateAdmin(id: string, dto: UpdateTripDto): Promise<TripEntity> {
    const existing = await this.findOneAdmin(id);

    const patched: Partial<TripEntity> = {
      ...existing,
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : existing.endDate,
    };
    await this.tripRepo.updateTrip(id, patched);
    return (await this.tripRepo.findById(id))!;
  }

  async removeForUser(id: string, userId: string): Promise<void> {
    const existing = await this.findOneForUser(id, userId);
    await this.tripRepo.deleteTrip(existing.id);
  }

  async removeAdmin(id: string): Promise<void> {
    const existing = await this.findOneAdmin(id);
    await this.tripRepo.deleteTrip(existing.id);
  }

  async listForUser(
    userId: string,
    page = 1,
    limit = 10,
    search?: string,
    status?: TripStatus,
    startDateFrom?: string,
    startDateTo?: string,
    endDateFrom?: string,
    endDateTo?: string,
    sortBy?: 'createdAt' | 'startDate' | 'endDate' | 'title' | 'status',
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<Paged<TripEntity>> {
    const {
      skip,
      limit: take,
      page: normalizedPage,
    } = PaginationHelper.validateParams(page, limit);
    const { items, total } = await this.tripRepo.listByUser(userId, {
      skip,
      take,
      search,
      status,
      startDateFrom: startDateFrom ? new Date(startDateFrom) : undefined,
      startDateTo: startDateTo ? new Date(startDateTo) : undefined,
      endDateFrom: endDateFrom ? new Date(endDateFrom) : undefined,
      endDateTo: endDateTo ? new Date(endDateTo) : undefined,
      sortBy,
      sortOrder,
    });
    return PaginationHelper.createResult(items, total, normalizedPage, take);
  }

  async listAll(
    page = 1,
    limit = 10,
    search?: string,
    status?: TripStatus,
    startDateFrom?: string,
    startDateTo?: string,
    endDateFrom?: string,
    endDateTo?: string,
    sortBy?: 'createdAt' | 'startDate' | 'endDate' | 'title' | 'status',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<TripListResponseDto> {
    const {
      skip,
      limit: take,
      page: normalizedPage,
    } = PaginationHelper.validateParams(page, limit);
    const { items, total } = await this.tripRepo.listAll({
      skip,
      take,
      search,
      status,
      startDateFrom: startDateFrom ? new Date(startDateFrom) : undefined,
      startDateTo: startDateTo ? new Date(startDateTo) : undefined,
      endDateFrom: endDateFrom ? new Date(endDateFrom) : undefined,
      endDateTo: endDateTo ? new Date(endDateTo) : undefined,
      sortBy,
      sortOrder,
    });
    return PaginationHelper.createResult(items, total, normalizedPage, take);
  }
}
