import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  LocationService,
  LocationSearchResponse,
  SimpleLocation,
} from './services/location.service';
import {
  LocationSearchDto,
  ReverseGeocodeDto,
} from 'src/location/dto/location.dto';

@ApiTags('Locations')
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search for locations' })
  @ApiResponse({ status: 200, description: 'Location search results' })
  async searchLocations(
    @Query() searchDto: LocationSearchDto,
  ): Promise<LocationSearchResponse> {
    return await this.locationService.searchLocations(searchDto);
  }

  @Get('reverse-geocode')
  @ApiOperation({ summary: 'Reverse geocode coordinates to location' })
  @ApiResponse({ status: 200, description: 'Reverse geocoding result' })
  async reverseGeocode(
    @Query() reverseDto: ReverseGeocodeDto,
  ): Promise<SimpleLocation | null> {
    return await this.locationService.reverseGeocode(reverseDto);
  }
}
