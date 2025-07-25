import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../../auth/guards/admin-role.guard';
import { AdminTripService } from './admin-trip.service';
import { ResponseUtil } from '../../shared/utils/response.util';
import { BaseResponse } from '../../shared/types/base-response.types';
import { PaginationResult } from '../../shared/types/pagination.types';
import { AdminTripQueryDto, AdminTripResponseDto } from './dto/admin-trip.dto';
import {
  BaseResponseDto,
  ErrorResponseDto,
} from '../../shared/dto/response.dto';

/**
 * Admin controller for trip management operations
 * Provides comprehensive trip oversight and analytics for administrators
 */
@ApiTags('Admin - Trips')
@ApiBearerAuth()
@Controller('admin/trips')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminTripController {
  constructor(private readonly adminTripService: AdminTripService) {}

  /**
   * Get all trips with advanced filtering and pagination
   */
  @ApiOperation({
    summary: 'Get all trips (Admin only)',
    description: `
      Retrieve all trips in the system with comprehensive filtering options.
      This endpoint provides administrators with complete oversight of all user trips,
      including user information, trip statistics, and sharing status.
      
      Features:
      - Full-text search across trip titles, descriptions, destinations, and user information
      - Filter by trip status, user, destination, dates, and sharing status
      - Sorting by various fields (creation date, start date, title, etc.)
      - Detailed statistics for each trip (itinerary count, activities, estimated costs)
      - Pagination for efficient data loading
    `,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description:
      'Search across trip titles, descriptions, destinations, and user info',
    example: 'Tokyo',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Field to sort by',
    example: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'title', 'startDate', 'endDate', 'status'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by trip status',
    example: 'planning',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Filter by user ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'userEmail',
    required: false,
    type: String,
    description: 'Filter by user email (partial match)',
    example: 'user@example.com',
  })
  @ApiQuery({
    name: 'destinationCountry',
    required: false,
    type: String,
    description: 'Filter by destination country code',
    example: 'JP',
  })
  @ApiQuery({
    name: 'destinationCity',
    required: false,
    type: String,
    description: 'Filter by destination city (partial match)',
    example: 'Tokyo',
  })
  @ApiQuery({
    name: 'timezone',
    required: false,
    type: String,
    description: 'Filter by timezone',
    example: 'Asia/Tokyo',
  })
  @ApiQuery({
    name: 'createdAfter',
    required: false,
    type: String,
    description: 'Filter trips created after this date (YYYY-MM-DD)',
    example: '2023-01-01',
  })
  @ApiQuery({
    name: 'createdBefore',
    required: false,
    type: String,
    description: 'Filter trips created before this date (YYYY-MM-DD)',
    example: '2023-12-31',
  })
  @ApiQuery({
    name: 'startDateAfter',
    required: false,
    type: String,
    description: 'Filter trips with start date after this date (YYYY-MM-DD)',
    example: '2023-06-01',
  })
  @ApiQuery({
    name: 'startDateBefore',
    required: false,
    type: String,
    description: 'Filter trips with start date before this date (YYYY-MM-DD)',
    example: '2023-12-31',
  })
  @ApiQuery({
    name: 'isShared',
    required: false,
    type: Boolean,
    description:
      'Filter by sharing status (true for shared trips, false for private)',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description:
      'Trips retrieved successfully with pagination and user information',
    type: BaseResponseDto,
    schema: {
      example: {
        result: 'OK',
        status: 200,
        data: {
          items: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              title: 'Amazing Tokyo Adventure',
              description: 'Exploring the vibrant culture and cuisine of Tokyo',
              status: 'planning',
              destinationName: 'Tokyo, Japan',
              destinationCountry: 'JP',
              destinationCity: 'Tokyo',
              startDate: '2023-08-15T00:00:00.000Z',
              endDate: '2023-08-22T00:00:00.000Z',
              createdAt: '2023-07-01T10:30:00.000Z',
              updatedAt: '2023-07-02T14:20:00.000Z',
              thumbnailUrl: 'https://example.com/trip-thumbnail.jpg',
              isShared: true,
              shareToken: 'abc123xyz',
              user: {
                id: '456e7890-e12c-34d5-a678-901234567890',
                email: 'user@example.com',
                firstName: 'John',
                lastName: 'Doe',
                createdAt: '2023-06-01T09:00:00.000Z',
              },
              statistics: {
                itineraryCount: 7,
                totalActivities: 23,
                estimatedCost: 1250.5,
              },
            },
          ],
          meta: {
            page: 1,
            limit: 10,
            total: 145,
            totalPages: 15,
            hasNext: true,
            hasPrev: false,
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin access required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  @Get()
  async getAllTrips(
    @Query() queryDto: AdminTripQueryDto,
  ): Promise<BaseResponse<PaginationResult<AdminTripResponseDto>>> {
    const result = await this.adminTripService.getAllTrips(queryDto);
    return ResponseUtil.success(result);
  }

  /**
   * Get trip details by ID (Admin access)
   */
  @ApiOperation({
    summary: 'Get trip details by ID (Admin only)',
    description: `
      Retrieve detailed information about a specific trip by ID.
      This endpoint allows administrators to access any trip without ownership restrictions,
      providing complete trip details including user information, itinerary, and statistics.
      
      Returns:
      - Complete trip information
      - User details who created the trip
      - Trip sharing information if applicable
      - Detailed statistics (itinerary count, activities, costs)
      - All associated data regardless of privacy settings
    `,
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Trip ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Trip details retrieved successfully',
    type: BaseResponseDto,
    schema: {
      example: {
        result: 'OK',
        status: 200,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Amazing Tokyo Adventure',
          description: 'Exploring the vibrant culture and cuisine of Tokyo',
          status: 'planning',
          destinationName: 'Tokyo, Japan',
          destinationCountry: 'JP',
          destinationCity: 'Tokyo',
          startDate: '2023-08-15T00:00:00.000Z',
          endDate: '2023-08-22T00:00:00.000Z',
          createdAt: '2023-07-01T10:30:00.000Z',
          updatedAt: '2023-07-02T14:20:00.000Z',
          thumbnailUrl: 'https://example.com/trip-thumbnail.jpg',
          isShared: true,
          shareToken: 'abc123xyz',
          user: {
            id: '456e7890-e12c-34d5-a678-901234567890',
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            createdAt: '2023-06-01T09:00:00.000Z',
          },
          statistics: {
            itineraryCount: 7,
            totalActivities: 23,
            estimatedCost: 1250.5,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin access required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  @Get(':id')
  async getTripById(
    @Param('id') tripId: string,
  ): Promise<BaseResponse<AdminTripResponseDto>> {
    const trip = await this.adminTripService.getTripById(tripId);
    return ResponseUtil.success(trip);
  }
}
