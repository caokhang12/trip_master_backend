import {
  Controller,
  Post,
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
import { AIService } from '../ai/services/ai.service';
import { ItineraryService } from './itinerary.service';
import { ResponseUtil } from '../shared/utils/response.util';
import { BaseResponse } from '../shared/types/base-response.types';
import { ErrorResponseDto } from '../shared/dto/response.dto';
import { AuthRequest } from '../auth/interfaces/auth.interface';
import { AIGenerationRequest } from '../ai/interfaces/ai.interface';
import {
  GenerateItineraryDto,
  LocationSuggestionsDto,
  CostEstimationDto,
} from './dto/ai-request.dto';
import {
  SaveGeneratedItineraryDto,
  SaveItineraryResponseDto,
} from './dto/save-itinerary.dto';
import {
  GeneratedItineraryDto,
  LocationSuggestionDto,
  CostEstimationResponseDto,
} from './dto/ai-response.dto';

/**
 * Controller for AI-powered travel planning features
 */
@ApiTags('AI Travel Planning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trips/:tripId/ai')
export class TripAIController {
  constructor(
    private readonly aiService: AIService,
    private readonly itineraryService: ItineraryService,
  ) {}

  /**
   * Generate comprehensive AI-powered travel itinerary
   */
  @ApiOperation({
    summary: 'Generate AI-powered travel itinerary and save',
    description:
      'Create a detailed, culturally-aware travel itinerary with cost estimates and local insights, automatically saved to database. For preview without saving, use /generate-preview endpoint.',
  })
  @ApiParam({
    name: 'tripId',
    type: String,
    description: 'Trip ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: GenerateItineraryDto,
    description:
      'Itinerary generation parameters including preferences and budget',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'AI itinerary generated successfully',
    type: GeneratedItineraryDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters or rate limit exceeded',
    type: ErrorResponseDto,
  })
  @Post('generate')
  async generateItinerary(
    @Req() req: AuthRequest,
    @Param('tripId') tripId: string,
    @Body() generateDto: GenerateItineraryDto,
  ): Promise<BaseResponse<GeneratedItineraryDto>> {
    // Convert DTO to AI request interface
    const aiRequest: AIGenerationRequest = {
      destination: generateDto.destination,
      country: generateDto.country,
      startDate: generateDto.startDate,
      endDate: generateDto.endDate,
      budget: generateDto.budget,
      currency: generateDto.currency,
      travelers: generateDto.travelers,
      preferences: {
        travelStyle: generateDto.preferences.travelStyle as
          | 'budget'
          | 'mid-range'
          | 'luxury'
          | 'backpacker'
          | 'family'
          | 'romantic'
          | 'adventure'
          | 'cultural',
        interests: generateDto.preferences.interests,
        dietaryRestrictions: generateDto.preferences.dietaryRestrictions,
        accessibilityNeeds: generateDto.preferences.accessibilityNeeds,
        transportPreference: generateDto.preferences.transportPreference as
          | 'walking'
          | 'public-transport'
          | 'motorbike'
          | 'car'
          | 'mixed'
          | undefined,
        activityLevel: generateDto.preferences.activityLevel as
          | 'low'
          | 'moderate'
          | 'high'
          | undefined,
        groupType: generateDto.preferences.groupType as
          | 'solo'
          | 'couple'
          | 'family'
          | 'friends'
          | 'business'
          | 'romantic'
          | undefined,
      },
      accommodationLocation: generateDto.accommodationLocation,
    };

    const itinerary = await this.aiService.generateItinerary(
      aiRequest,
      req.user.id,
    );
    return ResponseUtil.success(itinerary);
  }

  /**
   * Generate AI itinerary without saving to database
   */
  @ApiOperation({
    summary: 'Generate AI itinerary preview',
    description:
      'Generate AI-powered travel itinerary without saving to database. User can review and choose to save later.',
  })
  @ApiParam({
    name: 'tripId',
    type: String,
    description: 'Trip ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: GenerateItineraryDto,
    description: 'Trip details and preferences for AI generation',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI itinerary generated successfully (not saved)',
    type: GeneratedItineraryDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',
    type: ErrorResponseDto,
  })
  @Post('generate-preview')
  async generateItineraryPreview(
    @Req() req: AuthRequest,
    @Param('tripId') tripId: string,
    @Body() generateDto: GenerateItineraryDto,
  ): Promise<BaseResponse<GeneratedItineraryDto>> {
    // Convert DTO to AI request interface
    const aiRequest: AIGenerationRequest = {
      destination: generateDto.destination,
      country: generateDto.country,
      startDate: generateDto.startDate,
      endDate: generateDto.endDate,
      budget: generateDto.budget,
      currency: generateDto.currency,
      travelers: generateDto.travelers,
      preferences: {
        travelStyle: generateDto.preferences.travelStyle as
          | 'budget'
          | 'mid-range'
          | 'luxury'
          | 'backpacker'
          | 'family'
          | 'romantic'
          | 'adventure'
          | 'cultural',
        interests: generateDto.preferences.interests,
        dietaryRestrictions: generateDto.preferences.dietaryRestrictions,
        accessibilityNeeds: generateDto.preferences.accessibilityNeeds,
        transportPreference: generateDto.preferences.transportPreference as
          | 'walking'
          | 'public-transport'
          | 'motorbike'
          | 'car'
          | 'mixed'
          | undefined,
        activityLevel: generateDto.preferences.activityLevel as
          | 'low'
          | 'moderate'
          | 'high'
          | undefined,
        groupType: generateDto.preferences.groupType as
          | 'solo'
          | 'couple'
          | 'family'
          | 'friends'
          | 'business'
          | 'romantic'
          | undefined,
      },
      accommodationLocation: generateDto.accommodationLocation,
    };

    // Generate itinerary without saving to database
    const itinerary = await this.aiService.generateItinerary(
      aiRequest,
      req.user.id,
    );

    return ResponseUtil.success(itinerary, HttpStatus.OK);
  }

  /**
   * Get AI-powered location suggestions
   */
  @ApiOperation({
    summary: 'Get AI location suggestions',
    description:
      'Generate personalized activity suggestions based on location, style, and interests',
  })
  @ApiParam({
    name: 'tripId',
    type: String,
    description: 'Trip ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: LocationSuggestionsDto,
    description: 'Location and preference parameters',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location suggestions generated successfully',
    type: [LocationSuggestionDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid parameters or rate limit exceeded',
    type: ErrorResponseDto,
  })
  @Post('suggestions')
  async getLocationSuggestions(
    @Req() req: AuthRequest,
    @Param('tripId') tripId: string,
    @Body() suggestionsDto: LocationSuggestionsDto,
  ): Promise<BaseResponse<LocationSuggestionDto[]>> {
    const suggestions = await this.aiService.generateLocationSuggestions(
      suggestionsDto.location,
      suggestionsDto.travelStyle,
      suggestionsDto.budget,
      suggestionsDto.interests,
    );
    return ResponseUtil.success(suggestions);
  }

  /**
   * Generate AI-powered cost estimation
   */
  @ApiOperation({
    summary: 'Generate AI cost estimation',
    description:
      'Get intelligent cost estimates for activities and destinations with breakdowns',
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
    status: HttpStatus.OK,
    description: 'Cost estimation generated successfully',
    type: CostEstimationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid parameters or service unavailable',
    type: ErrorResponseDto,
  })
  @Post('cost-estimation')
  async generateCostEstimation(
    @Req() req: AuthRequest,
    @Param('tripId') tripId: string,
    @Body() costDto: CostEstimationDto,
  ): Promise<BaseResponse<CostEstimationResponseDto>> {
    const estimation = await this.aiService.generateCostEstimation(
      costDto.destination,
      costDto.activityType,
      costDto.duration,
      costDto.travelers || 1,
      costDto.travelStyle || 'mid-range',
    );
    return ResponseUtil.success(estimation);
  }

  /**
   * Save generated itinerary to database
   */
  @ApiOperation({
    summary: 'Save generated itinerary',
    description:
      'Save a previously generated AI itinerary to the database if user chooses to.',
  })
  @ApiParam({
    name: 'tripId',
    type: String,
    description: 'Trip ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: SaveGeneratedItineraryDto,
    description: 'Generated itinerary data and save preferences',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Itinerary saved successfully',
    type: SaveItineraryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request or trip not found',
    type: ErrorResponseDto,
  })
  @Post('save-itinerary')
  async saveGeneratedItinerary(
    @Req() req: AuthRequest,
    @Param('tripId') tripId: string,
    @Body() saveDto: SaveGeneratedItineraryDto,
  ): Promise<BaseResponse<SaveItineraryResponseDto>> {
    const result = await this.itineraryService.saveGeneratedItinerary(
      tripId,
      req.user.id,
      saveDto,
    );

    return ResponseUtil.success(result, HttpStatus.CREATED);
  }
}
