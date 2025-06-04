import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TripService } from './trip.service';
import { ItineraryService } from './itinerary.service';
import { ResponseUtil } from '../shared/utils/response.util';
import { BaseResponse } from '../shared/types/base-response.types';
import {
  CreateTripDto,
  UpdateTripDto,
  TripQueryDto,
  UpdateItineraryDto,
  GenerateItineraryDto,
  ShareTripDto,
  TripSearchDto,
} from './dto/trip.dto';
import { BaseResponseDto, ErrorResponseDto } from '../shared/dto/response.dto';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Controller for handling trip management operations
 */
@ApiTags('Trips')
@ApiBearerAuth()
@Controller('trips')
export class TripController {
  constructor(
    private readonly tripService: TripService,
    private readonly itineraryService: ItineraryService,
  ) {}

  /**
   * Create new trip
   */
  @ApiOperation({
    summary: 'Create a new trip',
    description:
      'Creates a new trip for the authenticated user with the provided details. The trip will be initialized with planning status.',
  })
  @ApiBody({
    type: CreateTripDto,
    description:
      'Trip creation data including destination, dates, and preferences',
  })
  @ApiResponse({
    status: 201,
    description: 'Trip created successfully',
    type: BaseResponseDto,
    examples: {
      success: {
        summary: 'Successful trip creation',
        value: {
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Amazing Japan Adventure 2024',
            description:
              'A comprehensive 7-day journey through Tokyo and Kyoto',
            destinationName: 'Tokyo, Japan',
            destinationCoords: { lat: 35.6762, lng: 139.6503 },
            startDate: '2024-03-15',
            endDate: '2024-03-22',
            budget: 3000,
            currency: 'USD',
            status: 'planning',
            isPublic: false,
            userId: '987fcdeb-51a2-43d1-9c23-f23456789012',
            createdAt: '2024-03-01T10:00:00.000Z',
            updatedAt: '2024-03-01T10:00:00.000Z',
          },
          meta: {
            timestamp: '2024-03-01T10:00:00.000Z',
            requestId: 'req_123456789',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @UseGuards(JwtAuthGuard)
  @Post()
  async createTrip(
    @Req() req: RequestWithUser,
    @Body() createTripDto: CreateTripDto,
  ): Promise<BaseResponse<any>> {
    const trip = await this.tripService.createTrip(req.user.id, createTripDto);
    return ResponseUtil.success(trip, HttpStatus.CREATED);
  }

  /**
   * Get user's trips with pagination
   */
  @ApiOperation({
    summary: 'Get user trips',
    description:
      'Retrieves a paginated list of trips belonging to the authenticated user with optional filtering and sorting.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['planning', 'booked', 'in_progress', 'completed', 'cancelled'],
    description: 'Filter by trip status',
    example: 'planning',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in trip titles and destinations',
    example: 'Japan',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'updatedAt', 'title', 'startDate', 'endDate'],
    description: 'Field to sort by (default: createdAt)',
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order (default: DESC)',
    example: 'DESC',
  })
  @ApiResponse({
    status: 200,
    description: 'User trips retrieved successfully',
    type: BaseResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserTrips(
    @Req() req: RequestWithUser,
    @Query() queryDto: TripQueryDto,
  ): Promise<BaseResponse<any>> {
    const result = await this.tripService.getUserTrips(req.user.id, queryDto);
    return ResponseUtil.success({
      trips: result.items,
      pagination: result.pagination,
    });
  }

  /**
   * Search user's trips
   */
  @ApiOperation({
    summary: 'Search user trips',
    description:
      'Performs a full-text search across user trips by title, destination, and description.',
  })
  @ApiQuery({
    name: 'query',
    type: String,
    description: 'Search query string',
    example: 'Japan temple culture',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 50)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: BaseResponseDto,
    schema: {
      example: {
        data: {
          trips: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              title: 'Amazing Japan Adventure 2024',
              description: 'Cultural exploration of Tokyo temples',
              destinationName: 'Tokyo, Japan',
              status: 'planning',
              relevanceScore: 0.95,
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid search query',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @UseGuards(JwtAuthGuard)
  @Get('search')
  async searchTrips(
    @Req() req: RequestWithUser,
    @Query() searchDto: TripSearchDto,
  ): Promise<BaseResponse<any>> {
    const result = await this.tripService.searchTrips(req.user.id, searchDto);
    return ResponseUtil.success({
      trips: result.items,
      pagination: result.pagination,
    });
  }

  /**
   * Get trip details with itinerary
   */
  @ApiOperation({
    summary: 'Get trip details',
    description:
      'Retrieves detailed information about a specific trip including its complete itinerary and activities.',
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
    examples: {
      success: {
        summary: 'Successfully retrieved trip details',
        value: {
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Amazing Japan Adventure 2024',
            description:
              'A comprehensive 7-day journey through Tokyo and Kyoto',
            destinationName: 'Tokyo, Japan',
            destinationCoords: { lat: 35.6762, lng: 139.6503 },
            startDate: '2024-03-15',
            endDate: '2024-03-22',
            budget: 3000,
            currency: 'USD',
            status: 'planning',
            isPublic: false,
            itinerary: [
              {
                id: 'itinerary_1',
                dayNumber: 1,
                date: '2024-03-15',
                activities: [
                  {
                    time: '09:00',
                    title: 'Visit Senso-ji Temple',
                    description: "Explore Tokyo's oldest temple",
                    location: 'Asakusa, Tokyo',
                    duration: 120,
                    cost: 0,
                    type: 'cultural',
                  },
                ],
              },
            ],
            createdAt: '2024-03-01T10:00:00.000Z',
            updatedAt: '2024-03-01T10:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found or access denied',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getTripDetails(
    @Req() req: RequestWithUser,
    @Param('id') tripId: string,
  ): Promise<BaseResponse<any>> {
    const trip = await this.tripService.getTripById(tripId, req.user.id);
    return ResponseUtil.success(trip);
  }

  /**
   * Update trip details
   */
  @ApiOperation({
    summary: 'Update trip',
    description:
      'Updates trip information including title, dates, budget, and other details. Only the trip owner can update their trips.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Trip ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateTripDto,
    description: 'Updated trip data (all fields are optional)',
  })
  @ApiResponse({
    status: 200,
    description: 'Trip updated successfully',
    type: BaseResponseDto,
    examples: {
      success: {
        summary: 'Successfully updated trip',
        value: {
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Amazing Japan Adventure 2024 - Extended',
            description:
              'Extended 10-day journey through Tokyo, Kyoto, and Osaka',
            destinationName: 'Tokyo & Kyoto, Japan',
            budget: 4500,
            currency: 'USD',
            status: 'booked',
            updatedAt: '2024-03-02T10:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid update data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found or access denied',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateTrip(
    @Req() req: RequestWithUser,
    @Param('id') tripId: string,
    @Body() updateTripDto: UpdateTripDto,
  ): Promise<BaseResponse<any>> {
    const trip = await this.tripService.updateTrip(
      tripId,
      req.user.id,
      updateTripDto,
    );
    return ResponseUtil.success(trip);
  }

  /**
   * Delete trip and related data
   */
  @ApiOperation({
    summary: 'Delete trip',
    description:
      'Permanently deletes a trip and all associated data including itinerary, activities, and sharing links. This action cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Trip ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Trip deleted successfully',
    type: BaseResponseDto,
    examples: {
      success: {
        summary: 'Successfully deleted trip',
        value: {
          data: {
            deleted: true,
          },
          meta: {
            timestamp: '2024-03-01T10:00:00.000Z',
            requestId: 'req_123456789',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found or access denied',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteTrip(
    @Req() req: RequestWithUser,
    @Param('id') tripId: string,
  ): Promise<BaseResponse<any>> {
    const result = await this.tripService.deleteTrip(tripId, req.user.id);
    return ResponseUtil.success({ deleted: result });
  }

  /**
   * Generate sharing link
   */
  @ApiOperation({
    summary: 'Generate trip sharing link',
    description:
      'Creates a secure, shareable link for the trip that allows public access without authentication. Optionally set an expiration date.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Trip ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: ShareTripDto,
    description: 'Share configuration including optional expiration date',
    required: false,
  })
  @ApiResponse({
    status: 201,
    description: 'Share link generated successfully',
    type: BaseResponseDto,
    examples: {
      success: {
        summary: 'Successfully generated share link',
        value: {
          data: {
            shareToken: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
            shareUrl:
              'https://tripmaster.com/public/trips/abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
            expiresAt: '2024-12-31T23:59:59.000Z',
            createdAt: '2024-03-01T10:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found or access denied',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @UseGuards(JwtAuthGuard)
  @Post(':id/share')
  async generateShareLink(
    @Req() req: RequestWithUser,
    @Param('id') tripId: string,
    @Body() shareDto: ShareTripDto,
  ): Promise<BaseResponse<any>> {
    const shareInfo = await this.tripService.generateShareLink(
      tripId,
      req.user.id,
      shareDto,
    );
    return ResponseUtil.success(shareInfo, HttpStatus.CREATED);
  }

  /**
   * Duplicate existing trip
   */
  @ApiOperation({
    summary: 'Duplicate trip',
    description:
      'Creates a complete copy of an existing trip including all itinerary data. The new trip will have "Copy of" prefix in the title.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Trip ID to duplicate (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Trip duplicated successfully',
    type: BaseResponseDto,
    examples: {
      success: {
        summary: 'Successfully copied trip',
        value: {
          data: {
            id: '987fcdeb-51a2-43d1-9c23-f23456789012',
            title: 'Copy of Amazing Japan Adventure 2024',
            description:
              'A comprehensive 7-day journey through Tokyo and Kyoto',
            destinationName: 'Tokyo, Japan',
            status: 'planning',
            budget: 3000,
            currency: 'USD',
            createdAt: '2024-03-01T11:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found or access denied',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @UseGuards(JwtAuthGuard)
  @Post(':id/duplicate')
  async duplicateTrip(
    @Req() req: RequestWithUser,
    @Param('id') tripId: string,
  ): Promise<BaseResponse<any>> {
    const trip = await this.tripService.duplicateTrip(tripId, req.user.id);
    return ResponseUtil.success(trip, HttpStatus.CREATED);
  }

  /**
   * Generate AI itinerary
   */
  @ApiOperation({
    summary: 'Generate AI-powered itinerary',
    description:
      'Uses OpenAI to generate a detailed daily itinerary based on trip details and user preferences. Considers budget, interests, and travel style.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Trip ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: GenerateItineraryDto,
    description: 'AI generation preferences and parameters',
    required: false,
  })
  @ApiResponse({
    status: 201,
    description: 'AI itinerary generated successfully',
    type: BaseResponseDto,
    examples: {
      success: {
        summary: 'Successfully generated AI itinerary',
        value: {
          data: {
            tripId: '123e4567-e89b-12d3-a456-426614174000',
            itinerary: [
              {
                dayNumber: 1,
                date: '2024-03-15',
                activities: [
                  {
                    time: '09:00',
                    title: 'Visit Senso-ji Temple',
                    description:
                      "Explore Tokyo's oldest temple with morning prayers",
                    location: 'Asakusa, Tokyo',
                    duration: 120,
                    cost: 0,
                    type: 'cultural',
                  },
                  {
                    time: '12:00',
                    title: 'Traditional Lunch',
                    description: 'Authentic tempura at historic restaurant',
                    location: 'Asakusa, Tokyo',
                    duration: 90,
                    cost: 25,
                    type: 'dining',
                  },
                ],
              },
            ],
            aiMetadata: {
              model: 'gpt-3.5-turbo',
              tokensUsed: 1250,
              generatedAt: '2024-03-01T10:00:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid generation parameters or insufficient trip data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found or access denied',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'AI service rate limit exceeded',
    type: ErrorResponseDto,
  })
  @UseGuards(JwtAuthGuard)
  @Post(':id/itinerary')
  async generateItinerary(
    @Req() req: RequestWithUser,
    @Param('id') tripId: string,
    @Body() generateDto: GenerateItineraryDto,
  ): Promise<BaseResponse<any>> {
    const itinerary = await this.itineraryService.generateItinerary(
      tripId,
      req.user.id,
      generateDto,
    );
    return ResponseUtil.success(itinerary, HttpStatus.CREATED);
  }

  /**
   * Update specific day itinerary
   */
  @ApiOperation({
    summary: 'Update day itinerary',
    description:
      'Updates the activities and schedule for a specific day of the trip. Marks the itinerary as user-modified.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Trip ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'day',
    type: String,
    description: 'Day number (starting from 1)',
    example: '1',
  })
  @ApiBody({
    type: UpdateItineraryDto,
    description: 'Updated activities and date for the specified day',
  })
  @ApiResponse({
    status: 200,
    description: 'Day itinerary updated successfully',
    type: BaseResponseDto,
    examples: {
      success: {
        summary: 'Successfully updated day itinerary',
        value: {
          data: {
            id: 'itinerary_1',
            tripId: '123e4567-e89b-12d3-a456-426614174000',
            dayNumber: 1,
            date: '2024-03-15',
            activities: [
              {
                time: '10:00',
                title: 'Tokyo National Museum',
                description: 'Discover Japanese art and cultural artifacts',
                location: 'Ueno, Tokyo',
                duration: 180,
                cost: 20,
                type: 'cultural',
              },
            ],
            userModified: true,
            updatedAt: '2024-03-01T12:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid day number or activity data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Trip or day not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @UseGuards(JwtAuthGuard)
  @Put(':id/itinerary/:day')
  async updateDayItinerary(
    @Req() req: RequestWithUser,
    @Param('id') tripId: string,
    @Param('day') dayNumber: string,
    @Body() updateDto: UpdateItineraryDto,
  ): Promise<BaseResponse<any>> {
    const itinerary = await this.itineraryService.updateDayItinerary(
      tripId,
      req.user.id,
      parseInt(dayNumber),
      updateDto,
    );
    return ResponseUtil.success(itinerary);
  }

  /**
   * Admin test endpoint for smoke testing
   */
  @ApiOperation({
    summary: 'Health check endpoint',
    description:
      'Simple health check endpoint to verify the trip service is running correctly. Used for monitoring and testing.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    type: BaseResponseDto,
    examples: {
      success: {
        summary: 'Health check successful',
        value: {
          data: {
            message: 'Trip service is running correctly',
            timestamp: '2024-03-01T10:00:00.000Z',
          },
        },
      },
    },
  })
  @Get('admin/test')
  adminTest(): BaseResponse<{ message: string; timestamp: Date }> {
    return ResponseUtil.success({
      message: 'Trip service is running correctly',
      timestamp: new Date(),
    });
  }
}

/**
 * Controller for public trip sharing
 */
@ApiTags('Public Trips')
@Controller('public/trips')
export class PublicTripController {
  constructor(private readonly tripService: TripService) {}

  /**
   * View shared trip (public access)
   */
  @ApiOperation({
    summary: 'Get shared trip',
    description:
      'Retrieves trip details using a public share token. No authentication required. Access is subject to share link expiration.',
  })
  @ApiParam({
    name: 'shareToken',
    type: String,
    description: 'Unique share token generated for the trip',
    example: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
  })
  @ApiResponse({
    status: 200,
    description: 'Shared trip retrieved successfully',
    type: BaseResponseDto,
    examples: {
      success: {
        summary: 'Successfully retrieved shared trip',
        value: {
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Amazing Japan Adventure 2024',
            description:
              'A comprehensive 7-day journey through Tokyo and Kyoto',
            destinationName: 'Tokyo, Japan',
            destinationCoords: { lat: 35.6762, lng: 139.6503 },
            startDate: '2024-03-15',
            endDate: '2024-03-22',
            budget: 3000,
            currency: 'USD',
            status: 'planning',
            itinerary: [
              {
                dayNumber: 1,
                date: '2024-03-15',
                activities: [
                  {
                    time: '09:00',
                    title: 'Visit Senso-ji Temple',
                    description: "Explore Tokyo's oldest temple",
                    location: 'Asakusa, Tokyo',
                    duration: 120,
                    cost: 0,
                    type: 'cultural',
                  },
                ],
              },
            ],
            sharedAt: '2024-03-01T10:00:00.000Z',
            expiresAt: '2024-12-31T23:59:59.000Z',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Share token not found or expired',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 410,
    description: 'Share link has expired',
    type: ErrorResponseDto,
  })
  @Get(':shareToken')
  async getSharedTrip(
    @Param('shareToken') shareToken: string,
  ): Promise<BaseResponse<any>> {
    const trip = await this.tripService.getSharedTrip(shareToken);
    return ResponseUtil.success(trip);
  }
}
