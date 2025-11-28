import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LocationService } from './services/location.service';
import {
  LocationSearchResult,
  LocationItem,
} from './interfaces/location.interfaces';
import { PlacesSearchService } from '../integrations/google-maps/services/places-search.service';
import { ResponseUtil } from '../shared/utils/response.util';
import { PlacesSearchDto } from '../integrations/google-maps/dto/places-search.dto';
import {
  SearchLocationDto,
  ReverseGeocodeRequest,
} from 'src/location/dto/location.dto';
import { BaseResponse } from '../shared/types/base-response.types';

@ApiTags('Locations')
@ApiBearerAuth()
@Controller('location')
export class LocationController {
  constructor(
    private readonly locationService: LocationService,
    private readonly placesSearchService: PlacesSearchService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Search for locations' })
  @ApiResponse({ status: 200, description: 'Location search results' })
  async searchLocations(
    @Query() searchDto: SearchLocationDto,
  ): Promise<BaseResponse<LocationSearchResult>> {
    const data: LocationSearchResult =
      await this.locationService.searchLocations(searchDto);
    return ResponseUtil.success(data);
  }

  @Get('reverse-geocode')
  @ApiOperation({ summary: 'Reverse geocode coordinates to location' })
  @ApiResponse({ status: 200, description: 'Reverse geocoding result' })
  async reverseGeocode(
    @Query() reverseDto: ReverseGeocodeRequest,
  ): Promise<BaseResponse<LocationItem | null>> {
    const data: LocationItem | null =
      await this.locationService.reverseGeocode(reverseDto);
    return ResponseUtil.success(data);
  }

  @Get('places')
  @ApiOperation({ summary: 'Google Places text search' })
  @ApiResponse({ status: 200, description: 'Places search results' })
  async placesSearch(@Query() dto: PlacesSearchDto) {
    const data = await this.placesSearchService.textSearch(dto);
    return ResponseUtil.success(data);
  }
}
