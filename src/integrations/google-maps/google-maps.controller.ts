import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PlacesService } from './services/places.service';
import { PlacesSearchService } from './services/places-search.service';
import { GeocodingService } from './services/geocoding.service';
import { ReverseGeocodingService } from './services/reverse-geocoding.service';
import { DirectionsService } from './services/directions.service';
import { DistanceMatrixService } from './services/distance-matrix.service';
import { ResponseUtil } from '../../shared/utils/response.util';
import {
  PlaceDetailsParamDto,
  PlaceDetailsQueryDto,
} from './dto/place-details.dto';
import { GeocodeDto } from './dto/geocode.dto';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';
import { DirectionsDto } from './dto/directions.dto';
import { DistanceMatrixDto } from './dto/distance-matrix.dto';
import { PlacesSearchDto } from './dto/places-search.dto';
import {
  PlaceDetailsResult,
  GeocodingResult,
  DirectionsResult,
  DistanceMatrixResult,
} from './types';

@ApiTags('Google Maps')
@ApiBearerAuth()
@Controller('google-maps')
export class GoogleMapsController {
  constructor(
    private readonly placesService: PlacesService,
    private readonly placesSearchService: PlacesSearchService,
    private readonly geocodingService: GeocodingService,
    private readonly reverseGeocodingService: ReverseGeocodingService,
    private readonly directionsService: DirectionsService,
    private readonly distanceMatrixService: DistanceMatrixService,
  ) {}

  @Get('place-details/:placeId')
  @ApiOperation({ summary: 'Get detailed information about a place' })
  @ApiResponse({
    status: 200,
    description: 'Place details retrieved successfully',
  })
  async getPlaceDetails(
    @Param() params: PlaceDetailsParamDto,
    @Query() query: PlaceDetailsQueryDto,
  ) {
    const result = await this.placesService.getPlaceDetails(
      params.placeId,
      query.language,
    );
    return ResponseUtil.success<PlaceDetailsResult>(result);
  }

  @Get('places/search')
  @ApiOperation({ summary: 'Search for places using text query' })
  @ApiResponse({
    status: 200,
    description: 'Places search completed successfully',
  })
  async searchPlaces(@Query() dto: PlacesSearchDto) {
    const result = await this.placesSearchService.textSearch(dto);
    return ResponseUtil.success(result);
  }

  @Post('geocode')
  @ApiOperation({ summary: 'Convert address to coordinates' })
  @ApiResponse({
    status: 200,
    description: 'Address geocoded successfully',
  })
  async geocode(@Body() dto: GeocodeDto) {
    const result = await this.geocodingService.geocode(
      dto.address,
      dto.region,
      dto.language,
    );
    return ResponseUtil.success<GeocodingResult>(result);
  }

  @Post('reverse-geocode')
  @ApiOperation({ summary: 'Convert coordinates to address' })
  @ApiResponse({
    status: 200,
    description: 'Coordinates reverse geocoded successfully',
  })
  async reverseGeocode(@Body() dto: ReverseGeocodeDto) {
    const result = await this.reverseGeocodingService.reverseGeocode(
      dto.lat,
      dto.lng,
      dto.language,
    );
    return ResponseUtil.success<GeocodingResult>(result);
  }

  @Post('directions')
  @ApiOperation({ summary: 'Get directions between locations' })
  @ApiResponse({
    status: 200,
    description: 'Directions retrieved successfully',
  })
  async getDirections(@Body() dto: DirectionsDto) {
    const result = await this.directionsService.getDirections({
      origin: dto.origin,
      destination: dto.destination,
      waypoints: dto.waypoints,
      mode: dto.mode,
      avoid: dto.avoid,
      language: dto.language,
    });
    return ResponseUtil.success<DirectionsResult>(result);
  }

  @Post('distance-matrix')
  @ApiOperation({ summary: 'Calculate distances and travel times' })
  @ApiResponse({
    status: 200,
    description: 'Distance matrix calculated successfully',
  })
  async getDistanceMatrix(@Body() dto: DistanceMatrixDto) {
    const result = await this.distanceMatrixService.getDistanceMatrix({
      origins: dto.origins,
      destinations: dto.destinations,
      mode: dto.mode,
      language: dto.language,
    });
    return ResponseUtil.success<DistanceMatrixResult>(result);
  }
}
