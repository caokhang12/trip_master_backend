import { Injectable, NotFoundException } from '@nestjs/common';
import { TripEntity } from '../schemas/trip.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { PaginationHelper } from '../shared/types/pagination';
import { TripStatus } from './enum/trip-enum';
import { TripRepository } from './trip.repository';
import {
  TripListResponseDto,
  AdminTripListResponseDto,
  TripListItemDto,
  AdminTripListItemDto,
} from 'src/trip/dto/trip-response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DestinationEntity } from 'src/schemas/destination.entity';
import { ItineraryRepository } from 'src/itinerary/itinerary.repository';
import { ActivityRepository } from 'src/activity/activity.repository';
import { TripMemberEntity, MemberRole } from 'src/schemas/trip-member.entity';
import { DestinationService } from 'src/destinations/destination.service';
import { ItineraryEntity } from 'src/schemas/itinerary.entity';
import { ActivityEntity } from 'src/schemas/activity.entity';
import { GeoPointInput, parseGeoPoint } from 'src/shared/utils/geo-point.util';

@Injectable()
export class TripService {
  constructor(
    private readonly tripRepo: TripRepository,
    @InjectRepository(DestinationEntity)
    private readonly destinationRepo: Repository<DestinationEntity>,
    @InjectRepository(TripMemberEntity)
    private readonly tripMemberRepo: Repository<TripMemberEntity>,
    private readonly itineraryRepo: ItineraryRepository,
    private readonly activityRepo: ActivityRepository,
    private readonly destinationService: DestinationService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Map TripEntity to TripListItemDto (lightweight for list responses)
   */
  private parseDestinationCoordinates(
    coordinates: GeoPointInput | null | undefined,
  ): { lat: number; lng: number } | undefined {
    return parseGeoPoint(coordinates);
  }

  private mapToListItemDto(trip: TripEntity): TripListItemDto {
    const thumbnailUrl =
      trip.images?.find((img) => img.isThumbnail)?.url || undefined;

    // Map primaryDestination to structured destinationLocation
    let destinationLocation:
      | {
          placeId: string;
          name: string;
          province?: string;
          country: string;
          city?: string;
          lat: number;
          lng: number;
        }
      | undefined = undefined;

    if (trip.primaryDestination) {
      const parsed = this.parseDestinationCoordinates(
        trip.primaryDestination.coordinates,
      );

      destinationLocation = {
        placeId: trip.primaryDestination.placeId || '',
        name: trip.primaryDestination.name,
        province: trip.primaryDestination.province,
        country: trip.primaryDestination.country,
        city: trip.primaryDestination.city,
        lat: parsed?.lat ?? 0,
        lng: parsed?.lng ?? 0,
      };
    }

    return {
      id: trip.id,
      title: trip.title,
      description: trip.description,
      timezone: trip.timezone,
      startDate: trip.startDate,
      endDate: trip.endDate,
      location: trip.primaryDestination?.name,
      destinationLocation,
      status: trip.status,
      budget: trip.budget,
      currency: trip.currency,
      isPublic: trip.isPublic,
      enableCostTracking: trip.enableCostTracking,
      thumbnailUrl,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
    };
  }

  /**
   * Map TripEntity to AdminTripListItemDto (with owner info)
   */
  private mapToAdminListItemDto(trip: TripEntity): AdminTripListItemDto {
    const dto = this.mapToListItemDto(trip);
    return {
      ...dto,
      userId: trip.userId,
      ownerFirstName: trip.user?.firstName,
      ownerLastName: trip.user?.lastName,
    };
  }

  async create(userId: string, dto: CreateTripDto): Promise<TripEntity> {
    // Resolve or reuse primary destination
    let primaryDestinationId: string | undefined = undefined;
    if (dto.primaryDestinationId) {
      const exists = await this.destinationRepo.findOne({
        where: { id: dto.primaryDestinationId },
      });
      if (!exists) throw new NotFoundException('Primary destination not found');
      primaryDestinationId = dto.primaryDestinationId;
    } else if (dto.destinationLocation) {
      const { placeId, name, lat, lng } = dto.destinationLocation;
      const resolved = await this.destinationService.resolve({
        placeId,
        name,
        lat,
        lng,
        createIfNotFound: true,
      });
      primaryDestinationId = resolved?.id;
    }

    const createdTrip = await this.dataSource.transaction(async (manager) => {
      const tripRepoTx = manager.getRepository(TripEntity);
      const tripMemberRepoTx = manager.getRepository(TripMemberEntity);
      const itineraryRepoTx = manager.getRepository(ItineraryEntity);
      const activityRepoTx = manager.getRepository(ActivityEntity);

      const trip = tripRepoTx.create({
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
      await tripRepoTx.save(trip);

      // Automatically add trip creator as OWNER member
      await tripMemberRepoTx.save({
        trip: { id: trip.id },
        user: { id: userId },
        role: MemberRole.OWNER,
        joinedAt: new Date(),
      });

      // Create itineraries and activities if provided
      if (
        dto.itineraries &&
        Array.isArray(dto.itineraries) &&
        dto.itineraries.length > 0
      ) {
        for (const itinInput of dto.itineraries) {
          const itinerary = itineraryRepoTx.create({
            tripId: trip.id,
            title: itinInput.title,
            notes: itinInput.notes,
            dayNumber: itinInput.dayNumber,
            date: itinInput.date ? new Date(itinInput.date) : undefined,
            aiGenerated: false,
            userModified: false,
          });
          await itineraryRepoTx.save(itinerary);

          if (
            itinInput.activities &&
            Array.isArray(itinInput.activities) &&
            itinInput.activities.length > 0
          ) {
            const activities = itinInput.activities.map((actInput) =>
              activityRepoTx.create({
                itineraryId: itinerary.id,
                time: actInput.time,
                title: actInput.title,
                description: actInput.description,
                duration: actInput.duration,
                cost: actInput.cost,
                type: actInput.type,
                orderIndex: actInput.orderIndex ?? 0,
              }),
            );
            await activityRepoTx.save(activities);
          }
        }
      }

      return trip;
    });

    return createdTrip;
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

    let primaryDestinationId =
      dto.primaryDestinationId ?? existing.primaryDestinationId;
    if (dto.destinationLocation) {
      const { placeId, name, lat, lng } = dto.destinationLocation;
      const resolved = await this.destinationService.resolve({
        placeId,
        name,
        lat,
        lng,
        createIfNotFound: true,
      });
      primaryDestinationId = resolved?.id ?? primaryDestinationId;
    }
    if (dto.primaryDestinationId) {
      const exists = await this.destinationRepo.findOne({
        where: { id: dto.primaryDestinationId },
      });
      if (!exists) throw new NotFoundException('Primary destination not found');
    }

    const patched: Partial<TripEntity> = {
      title: dto.title ?? existing.title,
      description: dto.description ?? existing.description,
      timezone: dto.timezone ?? existing.timezone,
      primaryDestinationId,
      startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : existing.endDate,
      budget: dto.budget ?? existing.budget,
      currency: dto.currency ?? existing.currency,
      status: dto.status ?? existing.status,
      isPublic: dto.isPublic ?? existing.isPublic,
      enableCostTracking: dto.enableCostTracking ?? existing.enableCostTracking,
    };
    await this.tripRepo.updateTrip(id, patched);
    return (await this.tripRepo.findById(id))!;
  }

  async updateAdmin(id: string, dto: UpdateTripDto): Promise<TripEntity> {
    const existing = await this.findOneAdmin(id);

    let primaryDestinationId =
      dto.primaryDestinationId ?? existing.primaryDestinationId;
    if (dto.destinationLocation) {
      const { placeId, name, lat, lng } = dto.destinationLocation;
      const resolved = await this.destinationService.resolve({
        placeId,
        name,
        lat,
        lng,
        createIfNotFound: true,
      });
      primaryDestinationId = resolved?.id ?? primaryDestinationId;
    }
    if (dto.primaryDestinationId) {
      const exists = await this.destinationRepo.findOne({
        where: { id: dto.primaryDestinationId },
      });
      if (!exists) throw new NotFoundException('Primary destination not found');
    }

    const patched: Partial<TripEntity> = {
      title: dto.title ?? existing.title,
      description: dto.description ?? existing.description,
      timezone: dto.timezone ?? existing.timezone,
      primaryDestinationId,
      startDate: dto.startDate ? new Date(dto.startDate) : existing.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : existing.endDate,
      budget: dto.budget ?? existing.budget,
      currency: dto.currency ?? existing.currency,
      status: dto.status ?? existing.status,
      isPublic: dto.isPublic ?? existing.isPublic,
      enableCostTracking: dto.enableCostTracking ?? existing.enableCostTracking,
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
    sortBy?:
      | 'createdAt'
      | 'startDate'
      | 'endDate'
      | 'title'
      | 'status'
      | 'budget',
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<TripListResponseDto> {
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
    // Map entities to DTOs
    const mappedItems = items.map((trip) => this.mapToListItemDto(trip));
    return PaginationHelper.createResult(
      mappedItems,
      total,
      normalizedPage,
      take,
    );
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
    sortBy?:
      | 'createdAt'
      | 'startDate'
      | 'endDate'
      | 'title'
      | 'status'
      | 'budget',
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<AdminTripListResponseDto> {
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
    // Map entities to admin DTOs
    const mappedItems = items.map((trip) => this.mapToAdminListItemDto(trip));
    return PaginationHelper.createResult(
      mappedItems,
      total,
      normalizedPage,
      take,
    );
  }
}
