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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TripService } from './trip.service';
import { ResponseUtil } from '../shared/utils/response.util';
import { BaseResponse } from '../shared/types/base-response.types';
import { CreateTripDto, UpdateTripDto } from './dto/trip.dto';
import {
  TripQueryDto,
  ShareTripDto,
  TripSearchDto,
} from './dto/trip-search.dto';
import { BaseResponseDto, ErrorResponseDto } from '../shared/dto/response.dto';
import { AuthRequest } from '../shared/interfaces/auth.interface';

/**
 * Simplified controller for core trip management operations
 */
@ApiTags('Trips')
@ApiBearerAuth()
@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripController {
  constructor(private readonly tripService: TripService) {}

  /**
   * Create new trip
   */
  @ApiOperation({
    summary: 'Create a new trip',
    description: 'Creates a new trip for the authenticated user.',
  })
  @ApiBody({ type: CreateTripDto })
  @ApiResponse({
    status: 201,
    description: 'Trip created successfully',
    type: BaseResponseDto,
  })
  @Post()
  async createTrip(
    @Req() req: AuthRequest,
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
      'Retrieves paginated list of trips for the authenticated user.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Trips retrieved successfully',
    type: BaseResponseDto,
  })
  @Get()
  async findUserTrips(
    @Req() req: AuthRequest,
    @Query() queryDto: TripQueryDto,
  ): Promise<BaseResponse<any>> {
    const result = await this.tripService.findUserTrips(req.user.id, queryDto);
    return ResponseUtil.success({
      trips: result.items,
      pagination: result.pagination,
    });
  }

  /**
   * Search user's trips by query
   */
  @ApiOperation({
    summary: 'Search user trips',
    description:
      'Search through user trips by title, description, or destination.',
  })
  @ApiQuery({ name: 'query', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: BaseResponseDto,
  })
  @Get('search')
  async searchTripsByQuery(
    @Req() req: AuthRequest,
    @Query() searchDto: TripSearchDto,
  ): Promise<BaseResponse<any>> {
    const result = await this.tripService.searchTripsByQuery(
      req.user.id,
      searchDto,
    );
    return ResponseUtil.success({
      trips: result.items,
      pagination: result.pagination,
    });
  }

  /**
   * Get trip details by ID
   */
  @ApiOperation({
    summary: 'Get trip details',
    description: 'Retrieves detailed information about a specific trip.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Trip ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Trip details retrieved successfully',
    type: BaseResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found',
    type: ErrorResponseDto,
  })
  @Get(':id')
  async findTripById(
    @Req() req: AuthRequest,
    @Param('id') tripId: string,
  ): Promise<BaseResponse<any>> {
    const trip = await this.tripService.findTripById(tripId, req.user.id);
    return ResponseUtil.success(trip);
  }

  /**
   * Update trip details
   */
  @ApiOperation({
    summary: 'Update trip',
    description: 'Updates trip information. Only the trip owner can update.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Trip ID (UUID)' })
  @ApiBody({ type: UpdateTripDto })
  @ApiResponse({
    status: 200,
    description: 'Trip updated successfully',
    type: BaseResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found',
    type: ErrorResponseDto,
  })
  @Put(':id')
  async updateTrip(
    @Req() req: AuthRequest,
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
   * Delete trip
   */
  @ApiOperation({
    summary: 'Delete trip',
    description: 'Permanently deletes a trip and all associated data.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Trip ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Trip deleted successfully',
    type: BaseResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found',
    type: ErrorResponseDto,
  })
  @Delete(':id')
  async deleteTrip(
    @Req() req: AuthRequest,
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
    description: 'Creates a secure, shareable link for the trip.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Trip ID (UUID)' })
  @ApiBody({ type: ShareTripDto, required: false })
  @ApiResponse({
    status: 201,
    description: 'Share link generated successfully',
    type: BaseResponseDto,
  })
  @Post(':id/share')
  async generateShareLink(
    @Req() req: AuthRequest,
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
    description: 'Creates a complete copy of an existing trip.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Trip ID (UUID)' })
  @ApiResponse({
    status: 201,
    description: 'Trip duplicated successfully',
    type: BaseResponseDto,
  })
  @Post(':id/duplicate')
  async duplicateTrip(
    @Req() req: AuthRequest,
    @Param('id') tripId: string,
  ): Promise<BaseResponse<any>> {
    const trip = await this.tripService.duplicateTrip(tripId, req.user.id);
    return ResponseUtil.success(trip, HttpStatus.CREATED);
  }

  /**
   * Health check endpoint
   */
  @ApiOperation({
    summary: 'Service health check',
    description: 'Test endpoint to verify trip service functionality',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is running correctly',
    type: BaseResponseDto,
  })
  @Get('admin/test')
  adminTest(): BaseResponse<{ message: string; timestamp: Date }> {
    return ResponseUtil.success({
      message: 'Trip service is running correctly',
      timestamp: new Date(),
    });
  }
}
