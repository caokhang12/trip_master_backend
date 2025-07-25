import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TripEntity } from '../../schemas/trip.entity';
import { UserEntity } from '../../schemas/user.entity';
import { ItineraryEntity } from '../../schemas/itinerary.entity';
import { ActivityCostEntity } from '../../schemas/activity-cost.entity';
import { TripShareEntity } from '../../schemas/trip-share.entity';
import {
  PaginationResult,
  PaginationHelper,
} from '../../shared/types/pagination.types';
import { AdminTripQueryDto, AdminTripResponseDto } from './dto/admin-trip.dto';

/**
 * Service for admin trip management operations
 */
@Injectable()
export class AdminTripService {
  constructor(
    @InjectRepository(TripEntity)
    private readonly tripRepository: Repository<TripEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ItineraryEntity)
    private readonly itineraryRepository: Repository<ItineraryEntity>,
    @InjectRepository(ActivityCostEntity)
    private readonly activityCostRepository: Repository<ActivityCostEntity>,
    @InjectRepository(TripShareEntity)
    private readonly tripShareRepository: Repository<TripShareEntity>,
  ) {}

  /**
   * Get all trips with admin filtering capabilities
   */
  async getAllTrips(
    queryDto: AdminTripQueryDto,
  ): Promise<PaginationResult<AdminTripResponseDto>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      status,
      userId,
      userEmail,
      destinationCountry,
      destinationCity,
      timezone,
      createdAfter,
      createdBefore,
      startDateAfter,
      startDateBefore,
      isShared,
    } = queryDto;

    const {
      page: validatedPage,
      limit: validatedLimit,
      skip,
    } = PaginationHelper.validateParams(page, limit);

    // Build the main query with joins
    const queryBuilder = this.tripRepository
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.user', 'user')
      .leftJoinAndSelect('trip.shareInfo', 'shareInfo');

    // Apply filters
    this.applyAdminFilters(queryBuilder, {
      search,
      status,
      userId,
      userEmail,
      destinationCountry,
      destinationCity,
      timezone,
      createdAfter,
      createdBefore,
      startDateAfter,
      startDateBefore,
      isShared,
    });

    // Apply sorting and pagination
    const validSortFields = [
      'createdAt',
      'updatedAt',
      'title',
      'startDate',
      'endDate',
      'status',
    ];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    queryBuilder
      .orderBy(`trip.${safeSortBy}`, sortOrder)
      .skip(skip)
      .take(validatedLimit);

    const [trips, total] = await queryBuilder.getManyAndCount();

    // Transform results to AdminTripResponseDto with statistics
    const transformedResults = await Promise.all(
      trips.map(async (trip) => {
        const statistics = await this.getTripStatistics(trip.id);
        return this.transformToAdminResponse(trip, statistics);
      }),
    );

    return PaginationHelper.createResult(
      transformedResults,
      total,
      validatedPage,
      validatedLimit,
    );
  }

  /**
   * Get trip by ID with admin privileges (no ownership check)
   */
  async getTripById(tripId: string): Promise<AdminTripResponseDto> {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['user', 'shareInfo'],
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const statistics = await this.getTripStatistics(tripId);
    return this.transformToAdminResponse(trip, statistics);
  }

  /**
   * Apply admin-specific filters to the query builder
   */
  private applyAdminFilters(
    queryBuilder: SelectQueryBuilder<TripEntity>,
    filters: {
      search?: string;
      status?: string;
      userId?: string;
      userEmail?: string;
      destinationCountry?: string;
      destinationCity?: string;
      timezone?: string;
      createdAfter?: string;
      createdBefore?: string;
      startDateAfter?: string;
      startDateBefore?: string;
      isShared?: boolean;
    },
  ): void {
    const {
      search,
      status,
      userId,
      userEmail,
      destinationCountry,
      destinationCity,
      timezone,
      createdAfter,
      createdBefore,
      startDateAfter,
      startDateBefore,
      isShared,
    } = filters;

    // Text search across multiple fields
    if (search) {
      queryBuilder.andWhere(
        `(
          trip.title ILIKE :search OR 
          trip.description ILIKE :search OR 
          trip.destinationName ILIKE :search OR
          user.email ILIKE :search OR
          user.firstName ILIKE :search OR
          user.lastName ILIKE :search
        )`,
        { search: `%${search}%` },
      );
    }

    // Status filter
    if (status) {
      queryBuilder.andWhere('trip.status = :status', { status });
    }

    // User ID filter
    if (userId) {
      queryBuilder.andWhere('trip.userId = :userId', { userId });
    }

    // User email filter
    if (userEmail) {
      queryBuilder.andWhere('user.email ILIKE :userEmail', {
        userEmail: `%${userEmail}%`,
      });
    }

    // Destination filters
    if (destinationCountry) {
      queryBuilder.andWhere('trip.destinationCountry = :destinationCountry', {
        destinationCountry,
      });
    }

    if (destinationCity) {
      queryBuilder.andWhere('trip.destinationCity ILIKE :destinationCity', {
        destinationCity: `%${destinationCity}%`,
      });
    }

    if (timezone) {
      queryBuilder.andWhere('trip.timezone = :timezone', { timezone });
    }

    // Date range filters for trip creation
    if (createdAfter) {
      queryBuilder.andWhere('trip.createdAt >= :createdAfter', {
        createdAfter: new Date(createdAfter),
      });
    }

    if (createdBefore) {
      queryBuilder.andWhere('trip.createdAt <= :createdBefore', {
        createdBefore: new Date(createdBefore),
      });
    }

    // Date range filters for trip start date
    if (startDateAfter) {
      queryBuilder.andWhere('trip.startDate >= :startDateAfter', {
        startDateAfter: new Date(startDateAfter),
      });
    }

    if (startDateBefore) {
      queryBuilder.andWhere('trip.startDate <= :startDateBefore', {
        startDateBefore: new Date(startDateBefore),
      });
    }

    // Shared status filter
    if (isShared !== undefined) {
      if (isShared) {
        queryBuilder.andWhere('shareInfo.id IS NOT NULL');
      } else {
        queryBuilder.andWhere('shareInfo.id IS NULL');
      }
    }
  }

  /**
   * Get detailed statistics for a trip
   */
  private async getTripStatistics(tripId: string): Promise<{
    itineraryCount: number;
    totalActivities: number;
    estimatedCost: number;
  }> {
    // Get itinerary count
    const itineraryCount = await this.itineraryRepository.count({
      where: { tripId },
    });

    // Get total activities count (count JSON array elements)
    const itinerariesWithActivities = await this.itineraryRepository.find({
      where: { tripId },
      select: ['activities'],
    });

    const totalActivities = itinerariesWithActivities.reduce(
      (total, itinerary) => {
        if (itinerary.activities && Array.isArray(itinerary.activities)) {
          return total + itinerary.activities.length;
        }
        return total;
      },
      0,
    );

    // Get estimated cost
    const costResult = await this.activityCostRepository
      .createQueryBuilder('cost')
      .leftJoin('cost.itinerary', 'itinerary')
      .where('itinerary.tripId = :tripId', { tripId })
      .select('SUM(cost.amount)', 'totalCost')
      .getRawOne<{ totalCost: string | null }>();

    const estimatedCost = parseFloat((costResult?.totalCost as string) || '0');

    return {
      itineraryCount,
      totalActivities,
      estimatedCost,
    };
  }

  /**
   * Transform trip entity to admin response DTO
   */
  private transformToAdminResponse(
    trip: TripEntity,
    statistics: {
      itineraryCount: number;
      totalActivities: number;
      estimatedCost: number;
    },
  ): AdminTripResponseDto {
    return {
      id: trip.id,
      title: trip.title,
      description: trip.description,
      status: trip.status,
      destinationName: trip.destinationName,
      destinationCountry: trip.destinationCountry,
      destinationCity: trip.destinationCity,
      startDate: trip.startDate,
      endDate: trip.endDate,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
      thumbnailUrl: trip.thumbnailUrl,
      isShared: !!trip.shareInfo,
      shareToken: trip.shareInfo?.shareToken,
      user: {
        id: trip.user.id,
        email: trip.user.email,
        firstName: trip.user.firstName || '',
        lastName: trip.user.lastName || '',
        createdAt: trip.user.createdAt,
      },
      statistics,
    };
  }
}
