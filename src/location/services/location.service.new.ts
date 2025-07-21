import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../shared/services/cache.service';
import { LocationSearchDto, ReverseGeocodeDto } from '../dto/location.dto';
import axios from 'axios';

export interface SimpleLocation {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  type: string;
  address?: string;
  country?: string;
}

export interface LocationSearchResponse {
  locations: SimpleLocation[];
  totalResults: number;
  searchTime: number;
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  name?: string;
  address?: {
    country?: string;
  };
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  async searchLocations(
    searchDto: LocationSearchDto,
  ): Promise<LocationSearchResponse> {
    const startTime = Date.now();
    this.logger.log(`Searching for: "${searchDto.query}"`);

    try {
      // Check cache first
      const cacheKey = `location_search_${searchDto.query}_${searchDto.limit || 10}`;
      const cached = this.cacheService.get<LocationSearchResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Search using Nominatim API directly
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: searchDto.query,
          format: 'json',
          addressdetails: 1,
          limit: searchDto.limit || 10,
        },
        headers: {
          'User-Agent': 'TripMaster/1.0',
        },
      });

      const results = response.data as NominatimResult[];

      // Convert to simple format
      const locations: SimpleLocation[] = results.map((place) => ({
        name: place.name || place.display_name.split(',')[0] || 'Unknown',
        displayName: place.display_name,
        lat: parseFloat(place.lat),
        lon: parseFloat(place.lon),
        type: place.type || 'unknown',
        address: place.display_name,
        country: place.address?.country,
      }));

      const searchResponse: LocationSearchResponse = {
        locations,
        totalResults: locations.length,
        searchTime: Date.now() - startTime,
      };

      // Cache results for 1 hour
      this.cacheService.set(cacheKey, searchResponse, 3600);

      return searchResponse;
    } catch (error) {
      this.logger.error(`Search failed: ${(error as Error).message}`);
      throw new HttpException(
        'Location search failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async reverseGeocode(
    reverseDto: ReverseGeocodeDto,
  ): Promise<SimpleLocation | null> {
    const { lat, lng } = reverseDto;
    this.logger.debug(`Reverse geocoding: ${lat}, ${lng}`);

    try {
      // Check cache first
      const cacheKey = `reverse_geocode_${lat}_${lng}`;
      const cached = this.cacheService.get<SimpleLocation>(cacheKey);
      if (cached) {
        return cached;
      }

      // Use Nominatim for reverse geocoding
      const response = await axios.get(`${this.baseUrl}/reverse`, {
        params: {
          lat,
          lon: lng,
          format: 'json',
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'TripMaster/1.0',
        },
      });

      const result = response.data as NominatimResult;

      if (!result || !result.lat || !result.lon) {
        return null;
      }

      const location: SimpleLocation = {
        name: result.name || result.display_name.split(',')[0] || 'Unknown',
        displayName: result.display_name,
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        type: result.type || 'unknown',
        address: result.display_name,
        country: result.address?.country,
      };

      // Cache for 1 hour
      this.cacheService.set(cacheKey, location, 3600);

      return location;
    } catch (error) {
      this.logger.error(
        `Reverse geocoding failed: ${(error as Error).message}`,
      );
      throw new HttpException(
        'Reverse geocoding failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
