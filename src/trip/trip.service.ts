import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TripEntity, TripStatus } from '../schemas/trip.entity';
import { ItineraryEntity } from '../schemas/itinerary.entity';
import { TripShareEntity } from '../schemas/trip-share.entity';
import { PaginationResult } from '../shared/types/pagination.types';
import { PaginationUtilService } from '../shared/utils/pagination.util';
import {
  CreateTripDto,
  UpdateTripDto,
  TripQueryDto,
  ShareTripDto,
  TripSearchDto,
} from './dto/trip.dto';

export interface TripWithItinerary extends TripEntity {
  itinerary: ItineraryEntity[];
  shareInfo?: TripShareEntity;
}

/**
 * Service for managing trip operations
 */
@Injectable()
export class TripService {
  constructor(
    @InjectRepository(TripEntity)
    private readonly tripRepository: Repository<TripEntity>,
    @InjectRepository(ItineraryEntity)
    private readonly itineraryRepository: Repository<ItineraryEntity>,
    @InjectRepository(TripShareEntity)
    private readonly tripShareRepository: Repository<TripShareEntity>,
  ) {}

  /**
   * Create a new trip for the authenticated user
   */
  async createTrip(
    userId: string,
    createTripDto: CreateTripDto,
  ): Promise<TripEntity> {
    this.validateDateRange(createTripDto.startDate, createTripDto.endDate);

    const trip = this.tripRepository.create({
      ...createTripDto,
      userId,
      startDate: createTripDto.startDate
        ? new Date(createTripDto.startDate)
        : undefined,
      endDate: createTripDto.endDate
        ? new Date(createTripDto.endDate)
        : undefined,
    });

    return await this.tripRepository.save(trip);
  }

  /**
   * Get user's trips with pagination and filtering
   */
  async getUserTrips(
    userId: string,
    queryDto: TripQueryDto,
  ): Promise<PaginationResult<TripEntity>> {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;
    const { skip } = PaginationUtilService.validateAndNormalizePagination(
      page,
      limit,
    );

    const queryBuilder = this.tripRepository
      .createQueryBuilder('trip')
      .where('trip.userId = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('trip.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(trip.title ILIKE :search OR trip.description ILIKE :search OR trip.destinationName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy(`trip.${sortBy}`, sortOrder).skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return PaginationUtilService.createPaginationResult(items, {
      page,
      limit,
      total,
    });
  }

  /**
   * Get trip by ID with itinerary (ownership validation)
   */
  async getTripById(
    tripId: string,
    userId?: string,
  ): Promise<TripWithItinerary> {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['itinerary', 'shareInfo'],
      order: {
        itinerary: {
          dayNumber: 'ASC',
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Check access permissions
    if (userId && trip.userId !== userId && !trip.isPublic) {
      throw new ForbiddenException('Access denied to this trip');
    }

    return trip as TripWithItinerary;
  }

  /**
   * Update trip details (with ownership validation)
   */
  async updateTrip(
    tripId: string,
    userId: string,
    updateTripDto: UpdateTripDto,
  ): Promise<TripEntity> {
    const trip = await this.findTripByIdAndUser(tripId, userId);

    this.validateDateRange(updateTripDto.startDate, updateTripDto.endDate);

    // Validate status transitions
    if (updateTripDto.status && updateTripDto.status !== trip.status) {
      this.validateStatusTransition(trip.status, updateTripDto.status);
    }

    const updateData = {
      ...updateTripDto,
      startDate: updateTripDto.startDate
        ? new Date(updateTripDto.startDate)
        : undefined,
      endDate: updateTripDto.endDate
        ? new Date(updateTripDto.endDate)
        : undefined,
    };

    await this.tripRepository.update(tripId, updateData);
    const updatedTrip = await this.tripRepository.findOne({
      where: { id: tripId },
    });
    if (!updatedTrip) {
      throw new NotFoundException('Trip not found after update');
    }
    return updatedTrip;
  }

  /**
   * Delete trip and related data (with ownership validation)
   */
  async deleteTrip(tripId: string, userId: string): Promise<boolean> {
    const trip = await this.findTripByIdAndUser(tripId, userId);

    // Cascade deletion is handled by database constraints
    await this.tripRepository.remove(trip);
    return true;
  }

  /**
   * Generate sharing link for trip
   */
  async generateShareLink(
    tripId: string,
    userId: string,
    shareDto: ShareTripDto,
  ): Promise<TripShareEntity> {
    await this.findTripByIdAndUser(tripId, userId);

    // Check if sharing link already exists
    let shareEntity = await this.tripShareRepository.findOne({
      where: { tripId },
    });

    if (shareEntity) {
      // Update existing share
      shareEntity.shareToken = uuidv4();
      shareEntity.expiresAt = shareDto.expiresAt
        ? new Date(shareDto.expiresAt)
        : undefined;
      shareEntity.viewCount = 0;
    } else {
      // Create new share
      shareEntity = this.tripShareRepository.create({
        tripId,
        shareToken: uuidv4(),
        expiresAt: shareDto.expiresAt
          ? new Date(shareDto.expiresAt)
          : undefined,
        viewCount: 0,
      });
    }

    return await this.tripShareRepository.save(shareEntity);
  }

  /**
   * Get shared trip by token (public access)
   */
  async getSharedTrip(shareToken: string): Promise<TripWithItinerary> {
    const shareEntity = await this.tripShareRepository.findOne({
      where: { shareToken },
      relations: ['trip', 'trip.itinerary'],
    });

    if (!shareEntity) {
      throw new NotFoundException('Invalid sharing link');
    }

    if (shareEntity.expiresAt && shareEntity.expiresAt < new Date()) {
      throw new BadRequestException('Sharing link has expired');
    }

    // Increment view count
    await this.tripShareRepository.update(shareEntity.id, {
      viewCount: shareEntity.viewCount + 1,
    });

    return {
      ...shareEntity.trip,
      itinerary: shareEntity.trip.itinerary.sort(
        (a, b) => a.dayNumber - b.dayNumber,
      ),
      shareInfo: shareEntity,
    } as TripWithItinerary;
  }

  /**
   * Search user's trips
   */
  async searchTrips(
    userId: string,
    searchDto: TripSearchDto,
  ): Promise<PaginationResult<TripEntity>> {
    const { query, page = 1, limit = 10 } = searchDto;
    const { skip } = PaginationUtilService.validateAndNormalizePagination(
      page,
      limit,
    );

    const queryBuilder = this.tripRepository
      .createQueryBuilder('trip')
      .where('trip.userId = :userId', { userId })
      .andWhere(
        '(trip.title ILIKE :query OR trip.description ILIKE :query OR trip.destinationName ILIKE :query)',
        { query: `%${query}%` },
      )
      .orderBy('trip.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return PaginationUtilService.createPaginationResult(items, {
      page,
      limit,
      total,
    });
  }

  /**
   * Duplicate existing trip
   */
  async duplicateTrip(tripId: string, userId: string): Promise<TripEntity> {
    const originalTrip = await this.getTripById(tripId, userId);

    // Create new trip with copied data
    const duplicatedTripData = {
      title: `${originalTrip.title} (Copy)`,
      description: originalTrip.description,
      destinationName: originalTrip.destinationName,
      destinationCoords: originalTrip.destinationCoords,
      budget: originalTrip.budget,
      currency: originalTrip.currency,
      status: TripStatus.PLANNING,
      isPublic: false,
    };

    const newTrip = await this.createTrip(userId, duplicatedTripData);

    // Copy itinerary if exists
    if (originalTrip.itinerary && originalTrip.itinerary.length > 0) {
      const itineraryPromises = originalTrip.itinerary.map(async (item) => {
        const newItinerary = this.itineraryRepository.create({
          tripId: newTrip.id,
          dayNumber: item.dayNumber,
          date: item.date,
          activities: item.activities,
          aiGenerated: item.aiGenerated,
          userModified: false, // Reset modification flag
        });
        return await this.itineraryRepository.save(newItinerary);
      });

      await Promise.all(itineraryPromises);
    }

    return newTrip;
  }

  /**
   * Find trip by ID and validate ownership
   */
  private async findTripByIdAndUser(
    tripId: string,
    userId: string,
  ): Promise<TripEntity> {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found or access denied');
    }

    return trip;
  }

  /**
   * Validate date range
   */
  private validateDateRange(startDate?: string, endDate?: string): void {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        throw new BadRequestException('Start date must be before end date');
      }
    }
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(
    currentStatus: TripStatus,
    newStatus: TripStatus,
  ): void {
    const validTransitions: Record<TripStatus, TripStatus[]> = {
      [TripStatus.PLANNING]: [TripStatus.BOOKED, TripStatus.CANCELLED],
      [TripStatus.BOOKED]: [TripStatus.COMPLETED, TripStatus.CANCELLED],
      [TripStatus.COMPLETED]: [], // No transitions from completed
      [TripStatus.CANCELLED]: [TripStatus.PLANNING], // Can restart planning
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}
