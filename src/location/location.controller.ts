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
  SuggestionsDto,
} from './dto/location.dto';
import { POISearchDto } from './dto/poi-search.dto';

/**
 * Location Controller - Optimized and consolidated
 * Provides comprehensive location search functionality with intelligent API routing
 */
@ApiTags('Locations')
@Controller('location')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  /**
   * Main search endpoint with intelligent routing
   */
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
  async searchLocations(@Query() searchDto: LocationSearchDto): Promise<any> {
    return await this.locationService.searchLocations(searchDto);
  }

  /**
   * Reverse geocoding endpoint
   */
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
  async reverseGeocode(@Query() reverseDto: ReverseGeocodeDto): Promise<any> {
    return await this.locationService.reverseGeocode(reverseDto);
  }

  /**
   * Bulk search endpoint
   */
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
  async bulkSearch(@Body() bulkDto: BulkLocationSearchDto): Promise<any> {
    return await this.locationService.bulkSearch(bulkDto);
  }

  /**
   * POI search endpoint
   */
  @Get('poi')
  @ApiOperation({
    summary: 'Search Points of Interest',
    description: 'Find POIs near specific coordinates with category filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'POI search results with pagination',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        page: { type: 'number' },
        limit: { type: 'number' },
        total: { type: 'number' },
        totalPages: { type: 'number' },
        hasNext: { type: 'boolean' },
        hasPrev: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid POI search parameters',
  })
  async searchPOI(@Query() poiDto: POISearchDto): Promise<any> {
    return await this.locationService.searchPOI(poiDto);
  }

  /**
   * Location suggestions endpoint
   */
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
    type: [SuggestionsDto],
  })
  async getSuggestions(
    @Query('query') query: string,
    @Query('limit') limit?: number,
  ): Promise<any> {
    return await this.locationService.getLocationSuggestions(query, limit || 5);
  }

  /**
   * Vietnamese regions endpoint
   */
  @Get('vietnam/provinces')
  @ApiOperation({
    summary: 'Get Vietnamese provinces',
    description: 'Retrieve list of Vietnamese provinces and regions',
  })
  @ApiResponse({
    status: 200,
    description: 'List of Vietnamese provinces',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          coordinates: { type: 'object' },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Unable to fetch Vietnamese regions',
  })
  async getVietnameseRegions(): Promise<any> {
    return await this.locationService.getVietnameseRegions();
  }

  /**
   * LEGACY ENDPOINTS - for backward compatibility
   */

  /**
   * Legacy search endpoint
   * @deprecated Use /search instead
   */
  @Get('search-location')
  @ApiOperation({
    summary: 'Legacy location search',
    description:
      'Legacy endpoint for single location search - use /search instead',
  })
  @ApiResponse({
    status: 200,
    description: 'Location search results',
    type: LocationSearchResponseDto,
  })
  async searchLocation(@Query() searchDto: LocationSearchDto): Promise<any> {
    return await this.locationService.searchLocation(searchDto);
  }

  /**
   * Legacy provinces endpoint
   * @deprecated Use /vietnam/provinces instead
   */
  @Get('vietnamese-provinces')
  @ApiOperation({
    summary: 'Legacy Vietnamese provinces',
    description:
      'Legacy endpoint for Vietnamese provinces - use /vietnam/provinces instead',
  })
  @ApiResponse({
    status: 200,
    description: 'List of Vietnamese provinces',
    schema: {
      type: 'array',
      items: { type: 'object' },
    },
  })
  async getVietnameseProvinces(): Promise<any> {
    return await this.locationService.getVietnameseProvinces();
  }

  /**
   * Service health check endpoint
   */
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
        'search',
        'reverse-geocode',
        'bulk-search',
        'poi',
        'suggestions',
        'vietnam/provinces',
      ],
    };
  }
}
