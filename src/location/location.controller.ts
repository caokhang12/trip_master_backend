import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocationService } from './services/location.service';
import {
  LocationSearchDto,
  ReverseGeocodeDto,
  BulkLocationSearchDto,
  LocationSearchResponseDto,
  ReverseGeocodeResponseDto,
  BulkLocationSearchResponseDto,
  POISearchDto,
} from './dto/location.dto';
import {
  SmartLocationSearchResponse,
  ReverseGeocodeResult,
  BulkSearchResponse,
  PointOfInterest,
} from './interfaces/smart-location.interface';
import { PaginationResult } from '../shared/types/pagination.types';

/**
 * Location Controller - Optimized and consolidated
 * Provides comprehensive location search functionality with intelligent API routing
 */
@ApiTags('Locations')
@Controller('location')
//@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search for locations with intelligent routing',
    description:
      'Unified search endpoint with Vietnam-first optimization and smart API selection',
  })
  @ApiResponse({
    status: 200,
    description: 'Location search results',
    type: LocationSearchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid search parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async searchLocations(
    @Query() searchDto: LocationSearchDto,
  ): Promise<SmartLocationSearchResponse> {
    return await this.locationService.searchLocations(searchDto);
  }

  @Get('reverse-geocode')
  @ApiOperation({
    summary: 'Reverse geocode coordinates to location',
    description:
      'Convert latitude/longitude to location details with smart API selection',
  })
  @ApiResponse({
    status: 200,
    description: 'Reverse geocoding result',
    type: ReverseGeocodeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid coordinates',
  })
  @ApiResponse({
    status: 404,
    description: 'No location found for coordinates',
  })
  async reverseGeocode(
    @Query() reverseDto: ReverseGeocodeDto,
  ): Promise<ReverseGeocodeResult> {
    return await this.locationService.reverseGeocode(reverseDto);
  }

  @Post('bulk-search')
  @ApiOperation({
    summary: 'Bulk location search',
    description: 'Perform bulk location searches with parallel processing',
  })
  @ApiBody({ type: BulkLocationSearchDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk search results',
    type: BulkLocationSearchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid bulk search parameters',
  })
  async bulkSearch(
    @Body() bulkDto: BulkLocationSearchDto,
  ): Promise<BulkSearchResponse> {
    return await this.locationService.bulkSearch(bulkDto);
  }

  @Get('poi')
  @ApiOperation({
    summary: 'Search Points of Interest',
    description: 'Find POIs near specific coordinates with category filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'POI search results with pagination',
    type: 'object',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid POI search parameters',
  })
  async searchPOI(
    @Query() poiDto: POISearchDto,
  ): Promise<PaginationResult<PointOfInterest>> {
    return await this.locationService.searchPOI(poiDto);
  }

  @Get('suggestions')
  @ApiOperation({
    summary: 'Get location suggestions',
    description: 'Get location name suggestions based on partial input',
  })
  @ApiQuery({
    name: 'query',
    description: 'Partial location name',
    example: 'Ho Chi',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of suggestions',
    required: false,
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Location suggestions',
    type: [String],
  })
  async getSuggestions(
    @Query('query') query: string,
    @Query('limit') limit?: number,
  ): Promise<string[]> {
    return await this.locationService.getLocationSuggestions(query, limit || 5);
  }

  @Get('vietnam/provinces')
  @ApiOperation({
    summary: 'Get Vietnamese provinces',
    description: 'Retrieve list of Vietnamese provinces and regions',
  })
  @ApiResponse({
    status: 200,
    description: 'List of Vietnamese provinces',
    type: 'array',
  })
  @ApiResponse({
    status: 503,
    description: 'Unable to fetch Vietnamese regions',
  })
  async getVietnameseRegions(): Promise<any[]> {
    return await this.locationService.getVietnameseRegions();
  }

  @Get('test')
  @ApiOperation({
    summary: 'Service health check',
    description: 'Test endpoint to verify location service functionality',
  })
  @ApiResponse({
    status: 200,
    description: 'Service status and available endpoints',
  })
  testService(): {
    status: string;
    timestamp: string;
    availableEndpoints: string[];
  } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      availableEndpoints: [
        'GET /search - Main location search with intelligent routing',
        'GET /reverse-geocode - Convert coordinates to location details',
        'POST /bulk-search - Bulk location searches with parallel processing',
        'GET /poi - Search Points of Interest near coordinates',
        'GET /suggestions - Get location name suggestions for autocomplete',
        'GET /vietnam/provinces - Get Vietnamese provinces and regions',
      ],
    };
  }
}
