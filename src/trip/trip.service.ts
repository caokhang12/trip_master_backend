import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TripEntity, TripStatus } from '../schemas/trip.entity';
import { ItineraryEntity } from '../schemas/itinerary.entity';
import { TripShareEntity } from '../schemas/trip-share.entity';
import { PaginationResult } from '../shared/types/pagination.types';
import { PaginationUtilService } from '../shared/utils/pagination.util';
import { CountryDefaultsService } from '../shared/services/country-defaults.service';
import {
  CountryService,
  CountryDetectionResult,
} from '../shared/services/country.service';
import { CreateTripDto, UpdateTripDto } from './dto/trip.dto';
import {
  TripQueryDto,
  ShareTripDto,
  TripSearchDto,
} from './dto/trip-search.dto';
import { TripDetails } from './interfaces/trip.interface';

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
    private readonly countryDefaultsService: CountryDefaultsService,
    private readonly countryService: CountryService,
  ) {}

  /**
   * Create a new trip for the authenticated user
   */
  async createTrip(
    userId: string,
    createTripDto: CreateTripDto,
  ): Promise<TripEntity> {
    this.validateDateRange(createTripDto.startDate, createTripDto.endDate);

    // Start with base trip data
    let tripData = { ...createTripDto };

    // Apply country intelligence if coordinates are provided and detection is enabled
    if (
      createTripDto.destinationCoords &&
      createTripDto.detectCountryFromCoords !== false
    ) {
      try {
        tripData = await this.applyCountryIntelligence(tripData);
      } catch (error) {
        // Log error but don't fail trip creation if country detection fails
        console.warn('Country intelligence failed:', error);
      }
    }

    // Apply country-aware defaults if country code is available
    if (tripData.destinationCountry) {
      const countryDefaults = this.countryDefaultsService.applyCountryDefaults(
        tripData.destinationCountry,
        tripData,
      );
      tripData = { ...tripData, ...countryDefaults };
    }

    const trip = this.tripRepository.create({
      ...tripData,
      userId,
      startDate: tripData.startDate ? new Date(tripData.startDate) : undefined,
      endDate: tripData.endDate ? new Date(tripData.endDate) : undefined,
    });

    return await this.tripRepository.save(trip);
  }

  /**
   * Find user's trips with pagination and filtering
   */
  async findUserTrips(
    userId: string,
    queryDto: TripQueryDto,
  ): Promise<PaginationResult<TripEntity>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      ...filters
    } = queryDto;

    return this.buildTripQuery(
      userId,
      { page, limit, sortBy, sortOrder },
      filters,
    );
  }

  /**
   * Find trip by ID with itinerary (ownership validation)
   */
  async findTripById(tripId: string, userId?: string): Promise<TripDetails> {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['itinerary', 'shareInfo'],
      order: {
        itinerary: {
          dayNumber: 'ASC',
        },
      },
    });

    this.validateTripAccess(trip, userId);

    return trip as TripDetails;
  }

  /**
   * Update trip details (with ownership validation)
   */
  async updateTrip(
    tripId: string,
    userId: string,
    updateTripDto: UpdateTripDto,
  ): Promise<TripEntity> {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
    });

    this.validateTripAccess(trip, userId, true);

    this.validateDateRange(updateTripDto.startDate, updateTripDto.endDate);

    // Validate status transitions
    if (updateTripDto.status && updateTripDto.status !== trip!.status) {
      this.validateStatusTransition(trip!.status, updateTripDto.status);
    }

    // Apply country-aware defaults if country code is provided and different from current
    let updateData = { ...updateTripDto };
    if (
      updateTripDto.destinationCountry &&
      updateTripDto.destinationCountry !== trip!.destinationCountry
    ) {
      updateData = this.countryDefaultsService.applyCountryDefaults(
        updateTripDto.destinationCountry,
        updateData,
      );
    }

    const finalUpdateData = {
      ...updateData,
      startDate: updateData.startDate
        ? new Date(updateData.startDate)
        : undefined,
      endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
    };

    await this.tripRepository.update(tripId, finalUpdateData);
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
    const trip = await this.findAndValidateTripOwnership(tripId, userId);

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
    await this.findAndValidateTripOwnership(tripId, userId);

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
   * Find shared trip by token (public access)
   */
  async findSharedTripByToken(shareToken: string): Promise<TripDetails> {
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
    };
  }

  /**
   * Search trips by query string
   */
  async searchTripsByQuery(
    userId: string,
    searchDto: TripSearchDto,
  ): Promise<PaginationResult<TripEntity>> {
    const { query, page = 1, limit = 10 } = searchDto;
    const paginationOptions = {
      page,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'DESC' as const,
    };
    const filters = { search: query };

    return await this.buildTripQuery(userId, paginationOptions, filters);
  }

  /**
   * Duplicate existing trip with optimized batch operations
   */
  async duplicateTrip(tripId: string, userId: string): Promise<TripEntity> {
    const originalTrip = await this.findTripById(tripId, userId);

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

    // Batch copy itinerary if exists
    if (originalTrip.itinerary?.length > 0) {
      const itineraryEntities = originalTrip.itinerary.map((item) =>
        this.itineraryRepository.create({
          tripId: newTrip.id,
          dayNumber: item.dayNumber,
          date: item.date,
          activities: item.activities,
          aiGenerated: item.aiGenerated,
          userModified: false,
        }),
      );

      await this.itineraryRepository.save(itineraryEntities);
    }

    return newTrip;
  }

  /**
   * Find trip by ID and validate ownership
   */
  private async findAndValidateTripOwnership(
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
   * Build trip query with optimized filtering and pagination
   */
  private async buildTripQuery(
    userId: string,
    paginationOptions: {
      page: number;
      limit: number;
      sortBy: string;
      sortOrder: 'ASC' | 'DESC';
    },
    filters: Record<string, any>,
  ): Promise<PaginationResult<TripEntity>> {
    const { page, limit, sortBy, sortOrder } = paginationOptions;
    const { skip } = PaginationUtilService.validateAndNormalizePagination(
      page,
      limit,
    );

    const queryBuilder = this.tripRepository
      .createQueryBuilder('trip')
      .where('trip.userId = :userId', { userId });

    this.applyFilters(queryBuilder, filters);
    queryBuilder.orderBy(`trip.${sortBy}`, sortOrder).skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return PaginationUtilService.createPaginationResult(items, {
      page,
      limit,
      total,
    });
  }

  /**
   * Apply filters to query builder in a reusable way
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<TripEntity>,
    filters: Record<string, string | undefined>,
  ): void {
    const filterMappings: Record<string, string> = {
      status: 'trip.status = :status',
      destinationCountry: 'trip.destinationCountry = :destinationCountry',
      destinationCity: 'trip.destinationCity ILIKE :destinationCity',
      timezone: 'trip.timezone = :timezone',
      defaultCurrency: 'trip.defaultCurrency = :defaultCurrency',
    };

    Object.entries(filters).forEach(([key, value]) => {
      if (!value) return;

      if (key === 'search') {
        queryBuilder.andWhere(
          '(trip.title ILIKE :search OR trip.description ILIKE :search OR trip.destinationName ILIKE :search)',
          { search: `%${value}%` },
        );
      } else if (key === 'destinationCity') {
        queryBuilder.andWhere(filterMappings[key], { [key]: `%${value}%` });
      } else if (filterMappings[key]) {
        queryBuilder.andWhere(filterMappings[key], { [key]: value });
      }
    });
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

  /**
   * Apply country intelligence to auto-populate country-related fields from coordinates
   */
  private async applyCountryIntelligence(
    tripData: CreateTripDto,
  ): Promise<CreateTripDto> {
    if (!tripData.destinationCoords) {
      return tripData;
    }
    const { lat, lng } = tripData.destinationCoords;
    // Detect country from coordinates
    const countryDetection: CountryDetectionResult =
      await this.countryService.detectCountryFromCoordinates(lat, lng);
    // Create enhanced trip data with country intelligence
    const enhancedTripData = { ...tripData };
    // Auto-populate country code if not provided or if user prefers detected country
    if (!enhancedTripData.destinationCountry) {
      if (enhancedTripData.preferredCountry) {
        // Use the user's preferred country
        enhancedTripData.destinationCountry = enhancedTripData.preferredCountry;
      } else {
        // Use detected country from coordinates
        enhancedTripData.destinationCountry = countryDetection.countryCode;
      }
    }
    // Auto-populate administrative information if available
    if (countryDetection.administrativeInfo) {
      if (
        !enhancedTripData.destinationProvince &&
        countryDetection.administrativeInfo.province
      ) {
        enhancedTripData.destinationProvince =
          countryDetection.administrativeInfo.province;
      }
      if (
        !enhancedTripData.destinationCity &&
        countryDetection.administrativeInfo.city
      ) {
        enhancedTripData.destinationCity =
          countryDetection.administrativeInfo.city;
      }
    }
    // Auto-populate timezone if not provided
    if (!enhancedTripData.timezone && countryDetection.defaults.timezone) {
      enhancedTripData.timezone = countryDetection.defaults.timezone;
    }
    // Auto-populate currency if not provided and no budget currency is set
    if (
      !enhancedTripData.defaultCurrency &&
      countryDetection.defaults.currency
    ) {
      enhancedTripData.defaultCurrency = countryDetection.defaults.currency;
      // Also update budget currency if not explicitly set
      if (!enhancedTripData.currency) {
        enhancedTripData.currency = countryDetection.defaults.currency;
      }
    }
    return enhancedTripData;
  }

  /**
   * Validate trip access permissions
   */
  private validateTripAccess(
    trip: TripEntity | null,
    userId?: string,
    requireOwnership = false,
  ): void {
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (requireOwnership && trip.userId !== userId) {
      throw new ForbiddenException('Access denied to this trip');
    }

    if (userId && trip.userId !== userId && !trip.isPublic) {
      throw new ForbiddenException('Access denied to this trip');
    }
  }
}
