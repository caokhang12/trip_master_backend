import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  LocationService,
  Location,
  Province,
  POI,
} from './services/location.service';
import { WeatherService, WeatherResponse } from './services/weather.service';
import { LocationSearchDto } from './dto/location-search.dto';
import { POISearchDto } from './dto/poi-search.dto';
import { WeatherRequestDto } from './dto/weather-request.dto';
import { ResponseUtil } from '../shared/utils/response.util';

@ApiTags('Locations')
@Controller('location')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LocationController {
  constructor(
    private readonly locationService: LocationService,
    private readonly weatherService: WeatherService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Search for locations with Vietnam optimization' })
  @ApiQuery({
    name: 'query',
    description: 'Search query (place name, address, or coordinates)',
    example: 'Hồ Chí Minh',
  })
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'User country code for search optimization',
    example: 'VN',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of results',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Locations found successfully',
    schema: {
      type: 'object',
      properties: {
        result: { type: 'string', example: 'OK' },
        status: { type: 'number', example: 200 },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid-string' },
              name: { type: 'string', example: 'Thành phố Hồ Chí Minh' },
              displayName: {
                type: 'string',
                example: 'Ho Chi Minh City, Vietnam',
              },
              coordinates: {
                type: 'object',
                properties: {
                  lat: { type: 'number', example: 10.8231 },
                  lng: { type: 'number', example: 106.6297 },
                },
              },
              country: { type: 'string', example: 'Vietnam' },
              countryCode: { type: 'string', example: 'VN' },
              province: { type: 'string', example: 'Hồ Chí Minh' },
              district: { type: 'string', example: 'Quận 1' },
              address: {
                type: 'string',
                example: 'Quận 1, Thành phố Hồ Chí Minh, Vietnam',
              },
              placeType: { type: 'string', example: 'city' },
              source: { type: 'string', example: 'goong' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    schema: {
      type: 'object',
      properties: {
        result: { type: 'string', example: 'ERROR' },
        status: { type: 'number', example: 400 },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: {
              type: 'string',
              example: 'Invalid search query provided',
            },
          },
        },
      },
    },
  })
  async searchLocations(@Query() searchDto: LocationSearchDto): Promise<{
    result: string;
    status: number;
    data: Location[];
  }> {
    const locations = await this.locationService.searchLocation(
      searchDto.query,
      searchDto.country,
    );

    return ResponseUtil.success(locations.slice(0, searchDto.limit || 10));
  }

  @Get('vietnam/provinces')
  @ApiOperation({
    summary: 'Get all Vietnamese provinces and administrative divisions',
  })
  @ApiResponse({
    status: 200,
    description: 'Vietnamese provinces retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        result: { type: 'string', example: 'OK' },
        status: { type: 'number', example: 200 },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 79 },
              name: { type: 'string', example: 'Thành phố Hồ Chí Minh' },
              slug: { type: 'string', example: 'thanh-pho-ho-chi-minh' },
              type: { type: 'string', example: 'thanh-pho' },
              nameWithType: {
                type: 'string',
                example: 'Thành phố Hồ Chí Minh',
              },
              code: { type: 'string', example: '79' },
              coordinates: {
                type: 'object',
                properties: {
                  lat: { type: 'number', example: 10.8231 },
                  lng: { type: 'number', example: 106.6297 },
                },
              },
              districts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number', example: 760 },
                    name: { type: 'string', example: 'Quận 1' },
                    type: { type: 'string', example: 'quan' },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async getVietnameseProvinces(): Promise<{
    result: string;
    status: number;
    data: Province[];
  }> {
    const provinces = await this.locationService.getVietnameseRegions();

    return ResponseUtil.success(provinces);
  }

  @Get('nearby-places')
  @ApiOperation({ summary: 'Find nearby places of interest' })
  @ApiQuery({
    name: 'lat',
    description: 'Latitude coordinate',
    example: 10.8231,
  })
  @ApiQuery({
    name: 'lng',
    description: 'Longitude coordinate',
    example: 106.6297,
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Category of places to search',
    example: 'attractions',
  })
  @ApiQuery({
    name: 'radius',
    required: false,
    description: 'Search radius in meters',
    example: 5000,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of results',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Nearby places found successfully',
    schema: {
      type: 'object',
      properties: {
        result: { type: 'string', example: 'OK' },
        status: { type: 'number', example: 200 },
        data: {
          type: 'object',
          properties: {
            places: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'poi_123456' },
                  name: { type: 'string', example: 'Independence Palace' },
                  category: { type: 'string', example: 'attractions' },
                  rating: { type: 'number', example: 4.2 },
                  coordinates: {
                    type: 'object',
                    properties: {
                      lat: { type: 'number', example: 10.7769 },
                      lng: { type: 'number', example: 106.6955 },
                    },
                  },
                  address: {
                    type: 'string',
                    example: '135 Nam Kỳ Khởi Nghĩa, Bến Thành, Quận 1',
                  },
                  source: { type: 'string', example: 'geoapify' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 25 },
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
                hasMore: { type: 'boolean', example: true },
              },
            },
          },
        },
      },
    },
  })
  async findNearbyPlaces(@Query() searchDto: POISearchDto): Promise<{
    result: string;
    status: number;
    data: {
      places: POI[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
      };
    };
  }> {
    const result = await this.locationService.findNearbyPlaces(
      searchDto.lat,
      searchDto.lng,
      searchDto.category || 'all',
      searchDto.radius || 5000,
      searchDto.limit || 20,
    );

    return ResponseUtil.success({
      places: result.items,
      pagination: {
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        hasMore: result.pagination.hasMore || false,
      },
    });
  }

  @Get('weather')
  @ApiOperation({ summary: 'Get weather information for a location' })
  @ApiQuery({
    name: 'lat',
    description: 'Latitude coordinate',
    example: 10.8231,
  })
  @ApiQuery({
    name: 'lng',
    description: 'Longitude coordinate',
    example: 106.6297,
  })
  @ApiQuery({
    name: 'includeForecast',
    required: false,
    description: 'Include 7-day forecast',
    example: true,
  })
  @ApiQuery({
    name: 'includeVietnamInfo',
    required: false,
    description: 'Include Vietnam-specific travel tips',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Weather information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        result: { type: 'string', example: 'OK' },
        status: { type: 'number', example: 200 },
        data: {
          type: 'object',
          properties: {
            current: {
              type: 'object',
              properties: {
                temperature: { type: 'number', example: 28.5 },
                feelsLike: { type: 'number', example: 32.1 },
                humidity: { type: 'number', example: 78 },
                description: { type: 'string', example: 'Partly cloudy' },
                icon: { type: 'string', example: '02d' },
                windSpeed: { type: 'number', example: 12.5 },
                visibility: { type: 'number', example: 10000 },
              },
            },
            forecast: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string', example: '2024-06-05' },
                  temperature: {
                    type: 'object',
                    properties: {
                      min: { type: 'number', example: 24 },
                      max: { type: 'number', example: 32 },
                    },
                  },
                  description: { type: 'string', example: 'Thunderstorms' },
                  humidity: { type: 'number', example: 85 },
                  chanceOfRain: { type: 'number', example: 80 },
                },
              },
            },
            location: {
              type: 'object',
              properties: {
                lat: { type: 'number', example: 10.8231 },
                lng: { type: 'number', example: 106.6297 },
                name: { type: 'string', example: 'Ho Chi Minh City' },
              },
            },
            vietnamSeasonInfo: {
              type: 'object',
              properties: {
                season: { type: 'string', example: 'rainy' },
                bestForTravel: { type: 'boolean', example: false },
                packingTips: {
                  type: 'array',
                  items: { type: 'string' },
                  example: [
                    'Bring waterproof jacket',
                    'Light, breathable clothing',
                  ],
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Rate Limit Exceeded',
    schema: {
      type: 'object',
      properties: {
        result: { type: 'string', example: 'ERROR' },
        status: { type: 'number', example: 429 },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
            message: {
              type: 'string',
              example: 'Weather API rate limit exceeded',
            },
            retryAfter: { type: 'number', example: 3600 },
          },
        },
      },
    },
  })
  async getWeather(@Query() weatherDto: WeatherRequestDto): Promise<{
    result: string;
    status: number;
    data: WeatherResponse;
  }> {
    const weather = await this.weatherService.getWeather(
      weatherDto.lat,
      weatherDto.lng,
      weatherDto.includeForecast,
      weatherDto.includeVietnamInfo,
    );

    return ResponseUtil.success(weather);
  }
}
