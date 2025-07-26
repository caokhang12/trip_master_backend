import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TripEntity, TripStatus } from '../../schemas/trip.entity';
import { ItineraryEntity } from '../../schemas/itinerary.entity';
import { TripShareEntity } from '../../schemas/trip-share.entity';
import {
  PaginationResult,
  PaginationHelper,
} from '../../shared/types/pagination.types';
import { CreateTripDto, UpdateTripDto } from '../dto/trip.dto';
import {
  TripQueryDto,
  ShareTripDto,
  TripSearchDto,
} from '../dto/trip-search.dto';
import { TripDetails } from '../interfaces/trip.interface';
import { UploadService } from '../../upload/upload.service';
import {
  TripImageUploadParams,
  TripImageRemovalParams,
  TripThumbnailParams,
  TripDetailDto,
  TripImageGallery,
  TripImageItem,
} from '../../upload/types/upload-integration.types';

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
    private readonly uploadService: UploadService,
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
    shareDto: ShareTripDto = {},
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

    // Prepare trip details
    const trip = shareEntity.trip;
    trip.itinerary = shareEntity.trip.itinerary.sort(
      (a, b) => a.dayNumber - b.dayNumber,
    );

    // Return as TripDetails with shareInfo
    const tripDetails = Object.assign(trip, {
      shareInfo: shareEntity,
    }) as TripDetails;

    return tripDetails;
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
   * Adds images to existing trip
   * @param params - Trip ID, user ID, and image files
   * @returns Updated trip with new image URLs
   */
  async addTripImages(params: TripImageUploadParams): Promise<TripDetailDto> {
    const { tripId, userId, files } = params;

    // Verify trip ownership
    const trip = await this.findTripById(tripId, userId);
    if (!trip) {
      throw new NotFoundException('Trip not found or access denied');
    }

    // Validate image count limits (max 20 per trip)
    const currentImageCount = trip.imageUrls?.length || 0;
    const newImageCount = files.length;
    const totalImages = currentImageCount + newImageCount;

    if (totalImages > 20) {
      throw new BadRequestException(
        `Image limit exceeded. Current: ${currentImageCount}, Adding: ${newImageCount}, Max: 20`,
      );
    }

    // Call upload service for batch image processing
    await this.uploadService.uploadTripImages(userId, tripId, files);

    // Get updated trip details
    const updatedTrip = await this.findTripById(tripId, userId);
    if (!updatedTrip) {
      throw new NotFoundException('Trip not found after update');
    }

    return this.transformToTripDetail(updatedTrip);
  }

  /**
   * Removes specific image from trip
   * @param params - Trip ID, user ID, and image public ID
   * @returns Updated trip without removed image
   */
  async removeTripImage(
    params: TripImageRemovalParams,
  ): Promise<TripDetailDto> {
    const { tripId, userId, publicId } = params;

    // Verify trip ownership and image exists
    const trip = await this.findTripById(tripId, userId);
    if (!trip) {
      throw new NotFoundException('Trip not found or access denied');
    }

    // Check if image exists in trip
    const imageExists = trip.imageUrls?.some((url) => url.includes(publicId));
    if (!imageExists) {
      throw new NotFoundException('Image not found in trip');
    }

    // Call upload service for file deletion
    await this.uploadService.deleteFile(userId, publicId);

    // Get updated trip details
    const updatedTrip = await this.findTripById(tripId, userId);
    if (!updatedTrip) {
      throw new NotFoundException('Trip not found after update');
    }

    return this.transformToTripDetail(updatedTrip);
  }

  /**
   * Sets trip thumbnail from existing images
   * @param params - Trip ID, user ID, and image URL
   * @returns Updated trip with new thumbnail
   */
  async setTripThumbnail(params: TripThumbnailParams): Promise<TripDetailDto> {
    const { tripId, userId, imageUrl } = params;

    // Verify trip ownership
    const trip = await this.findTripById(tripId, userId);
    if (!trip) {
      throw new NotFoundException('Trip not found or access denied');
    }

    // Verify image belongs to trip
    const imageExists = trip.imageUrls?.includes(imageUrl);
    if (!imageExists) {
      throw new BadRequestException('Image does not belong to this trip');
    }

    // Update thumbnail_url field
    await this.tripRepository.update(tripId, { thumbnailUrl: imageUrl });

    // Get updated trip details
    const updatedTrip = await this.findTripById(tripId, userId);
    if (!updatedTrip) {
      throw new NotFoundException('Trip not found after update');
    }

    return this.transformToTripDetail(updatedTrip);
  }

  /**
   * Retrieves trip with optimized image URLs
   * @param tripId - Trip identifier
   * @param userId - User identifier for ownership check
   * @returns Trip details with image gallery
   */
  async getTripWithImages(
    tripId: string,
    userId: string,
  ): Promise<TripDetailDto> {
    const trip = await this.findTripById(tripId, userId);
    if (!trip) {
      throw new NotFoundException('Trip not found or access denied');
    }

    return this.transformToTripDetail(trip);
  }

  /**
   * Transform trip entity to detailed DTO with image gallery
   * @param trip - Trip entity
   * @returns Trip detail DTO
   */
  private transformToTripDetail(trip: TripEntity): TripDetailDto {
    const imageUrls = trip.imageUrls || [];
    const thumbnailUrl = trip.thumbnailUrl || null;

    return {
      id: trip.id,
      title: trip.title,
      description: trip.description || '',
      imageUrls,
      thumbnailUrl,
      imageCount: imageUrls.length,
      hasImages: imageUrls.length > 0,
      gallery: this.buildImageGallery(imageUrls, thumbnailUrl),
    };
  }

  /**
   * Build image gallery data with optimized URLs
   * @param imageUrls - Array of image URLs
   * @param thumbnailUrl - Current thumbnail URL
   * @returns Image gallery data
   */
  private buildImageGallery(
    imageUrls: string[],
    thumbnailUrl: string | null,
  ): TripImageGallery {
    const images: TripImageItem[] = imageUrls.map((url) => ({
      url,
      publicId: this.uploadService.extractPublicIdFromUrl(url) || '',
      thumbnailUrl: this.generateThumbnailUrl(url),
      isSelected: url === thumbnailUrl,
    }));

    return {
      thumbnail: thumbnailUrl,
      images,
      totalCount: imageUrls.length,
    };
  }

  /**
   * Generate thumbnail URL with Cloudinary transformations
   * @param originalUrl - Original image URL
   * @returns Thumbnail URL
   */
  private generateThumbnailUrl(originalUrl: string): string {
    // Simple transformation for thumbnail (300x200)
    return originalUrl.replace('/upload/', '/upload/w_300,h_200,c_fill/');
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
    const {
      page: validatedPage,
      limit: validatedLimit,
      skip,
    } = PaginationHelper.validateParams(page, limit);

    const queryBuilder = this.tripRepository
      .createQueryBuilder('trip')
      .where('trip.userId = :userId', { userId });

    this.applyFilters(queryBuilder, filters);
    queryBuilder
      .orderBy(`trip.${sortBy}`, sortOrder)
      .skip(skip)
      .take(validatedLimit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return PaginationHelper.createResult(
      items,
      total,
      validatedPage,
      validatedLimit,
    );
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
