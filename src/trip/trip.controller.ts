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
@Controller('trips')
export class TripController {
  constructor(
    private readonly tripService: TripService,
    private readonly itineraryService: ItineraryService,
  ) {}

  /**
   * Create new trip
   */
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
@Controller('public/trips')
export class PublicTripController {
  constructor(private readonly tripService: TripService) {}

  /**
   * View shared trip (public access)
   */
  @Get(':shareToken')
  async getSharedTrip(
    @Param('shareToken') shareToken: string,
  ): Promise<BaseResponse<any>> {
    const trip = await this.tripService.getSharedTrip(shareToken);
    return ResponseUtil.success(trip);
  }
}
