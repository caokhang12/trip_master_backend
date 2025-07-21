import {
  Controller,
  Post,
  Put,
  Body,
  Param,
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
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ItineraryService } from './itinerary.service';
import { ResponseUtil } from '../shared/utils/response.util';
import { BaseResponse } from '../shared/types/base-response.types';
import {
  UpdateItineraryDto,
  GenerateItineraryOptionsDto,
} from './dto/itinerary.dto';
import { UpdateActivityCostDto } from './dto/cost.dto';
import { BaseResponseDto, ErrorResponseDto } from '../shared/dto/response.dto';
import { AuthRequest } from '../shared/interfaces/auth.interface';
import {
  LocationSuggestionsDto,
  CostEstimationDto,
} from '../shared/dto/ai-request.dto';

/**
 * Controller for itinerary and cost tracking operations
 */
@ApiTags('Itineraries')
@ApiBearerAuth()
@Controller('trips/:tripId/itinerary')
@UseGuards(JwtAuthGuard)
export class ItineraryController {
  constructor(private readonly itineraryService: ItineraryService) {}

  /**
   * Generate AI-powered itinerary
   */
  @ApiOperation({
    summary: 'Generate AI-powered itinerary',
    description:
      'Uses AI to generate detailed daily itinerary based on trip details.',
  })
  @ApiParam({
    name: 'tripId',
    type: String,
    description: 'Trip ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: GenerateItineraryOptionsDto,
    description: 'AI generation preferences and parameters',
    required: false,
  })
  @ApiResponse({
    status: 201,
    description: 'AI itinerary generated successfully',
    type: BaseResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid generation parameters',
    type: ErrorResponseDto,
  })
  @Post()
  async generateItinerary(
    @Req() req: AuthRequest,
    @Param('tripId') tripId: string,
    @Body() generateDto?: GenerateItineraryOptionsDto,
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
      'Updates activities and schedule for a specific day of the trip.',
  })
  @ApiParam({
    name: 'tripId',
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
  })
  @ApiResponse({
    status: 404,
    description: 'Trip or day not found',
    type: ErrorResponseDto,
  })
  @Put(':day')
  async updateDayItinerary(
    @Req() req: AuthRequest,
    @Param('tripId') tripId: string,
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
   * Update activity cost for a specific activity
   */
  @ApiOperation({
    summary: 'Update activity cost',
    description: 'Update the actual cost for a specific activity in a trip',
  })
  @ApiParam({
    name: 'tripId',
    description: 'Trip ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'activityId',
    description: 'Activity Cost ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Activity cost updated successfully',
    type: BaseResponseDto,
  })
  @Put('activities/:activityId/cost')
  async updateActivityCost(
    @Param('tripId') tripId: string,
    @Param('activityId') activityId: string,
    @Body() updateDto: UpdateActivityCostDto,
    @Req() req: AuthRequest,
  ): Promise<BaseResponse<any>> {
    const result = await this.itineraryService.updateActivityCost(
      tripId,
      req.user.id,
      activityId,
      updateDto,
    );
    return ResponseUtil.success(result);
  }

  /**
   * Generate AI-powered location suggestions
   */
  @ApiOperation({
    summary: 'Generate AI-powered location suggestions',
    description:
      'Get personalized activity suggestions based on location and preferences',
  })
  @ApiParam({
    name: 'tripId',
    type: String,
    description: 'Trip ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: LocationSuggestionsDto,
    description: 'Location and preference parameters for suggestions',
  })
  @ApiResponse({
    status: 200,
    description: 'AI suggestions generated successfully',
    type: BaseResponseDto,
  })
  @Post('ai/suggestions')
  async generateLocationSuggestions(
    @Req() req: AuthRequest,
    @Param('tripId') tripId: string,
    @Body() suggestionsDto: LocationSuggestionsDto,
  ): Promise<BaseResponse<any>> {
    const suggestions = await this.itineraryService.generateLocationSuggestions(
      tripId,
      req.user.id,
      suggestionsDto,
    );
    return ResponseUtil.success(suggestions);
  }

  /**
   * Generate AI-powered cost estimation
   */
  @ApiOperation({
    summary: 'Generate AI-powered cost estimation',
    description:
      'Get intelligent cost estimates for activities and destinations',
  })
  @ApiParam({
    name: 'tripId',
    type: String,
    description: 'Trip ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: CostEstimationDto,
    description: 'Cost estimation parameters',
  })
  @ApiResponse({
    status: 200,
    description: 'Cost estimation generated successfully',
    type: BaseResponseDto,
  })
  @Post('ai/cost-estimation')
  async generateCostEstimation(
    @Req() req: AuthRequest,
    @Param('tripId') tripId: string,
    @Body() costDto: CostEstimationDto,
  ): Promise<BaseResponse<any>> {
    const estimation = await this.itineraryService.generateCostEstimation(
      tripId,
      req.user.id,
      costDto,
    );
    return ResponseUtil.success(estimation);
  }
}
