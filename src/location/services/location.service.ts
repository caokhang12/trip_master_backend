import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CacheService } from '../../shared/services/cache.service';
import { APIThrottleService } from '../../shared/services/api-throttle.service';
import { SearchLocationDto, ReverseGeocodeRequest } from '../dto/location.dto';
import {
  LocationItem,
  LocationSearchResult,
} from '../interfaces/location.interfaces';

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  name?: string;
  address?: { country?: string };
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';

  constructor(
    private readonly configService: ConfigService,
    private readonly cache: CacheService,
    private readonly throttle: APIThrottleService,
  ) {}

  async searchLocations(
    searchDto: SearchLocationDto,
  ): Promise<LocationSearchResult> {
    const start = Date.now();
    this.logger.log(`Searching for: "${searchDto.query}"`);

    try {
      const cacheKey = `location_search_${searchDto.query}_${searchDto.limit || 10}`;
      const cached = this.cache.get<LocationSearchResult>(cacheKey);
      if (cached) return cached;

      const allowed = this.throttle.checkAndLog('nominatim');
      if (!allowed) {
        throw new HttpException(
          'Nominatim quota exceeded',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const resp = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: searchDto.query,
          format: 'json',
          addressdetails: 1,
          limit: searchDto.limit || 10,
        },
        headers: { 'User-Agent': 'TripMaster/1.0' },
      });

      const results = (resp.data as NominatimResult[]) || [];
      const locations: LocationItem[] = results.map((p) => ({
        name: p.name || p.display_name.split(',')[0] || 'Unknown',
        displayName: p.display_name,
        lat: parseFloat(p.lat),
        lon: parseFloat(p.lon),
        type: p.type || 'unknown',
        address: p.display_name,
        country: p.address?.country,
      }));

      const out: LocationSearchResult = {
        locations,
        totalResults: locations.length,
        searchTime: Date.now() - start,
      };

      this.cache.set(cacheKey, out, 3600);
      return out;
    } catch (e) {
      this.logger.error(`Search failed: ${(e as Error).message}`);
      throw new HttpException(
        'Location search failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async reverseGeocode(
    reverseDto: ReverseGeocodeRequest,
  ): Promise<LocationItem | null> {
    const { lat, lng } = reverseDto;
    this.logger.debug(`Reverse geocoding: ${lat}, ${lng}`);

    try {
      const cacheKey = `reverse_geocode_${lat}_${lng}`;
      const cached = this.cache.get<LocationItem>(cacheKey);
      if (cached) return cached;

      const allowed = this.throttle.checkAndLog('nominatim');
      if (!allowed) {
        throw new HttpException(
          'Nominatim quota exceeded',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const resp = await axios.get(`${this.baseUrl}/reverse`, {
        params: { lat, lon: lng, format: 'json', addressdetails: 1 },
        headers: { 'User-Agent': 'TripMaster/1.0' },
      });

      const r = resp.data as NominatimResult;
      if (!r || !r.lat || !r.lon) return null;

      const loc: LocationItem = {
        name: r.name || r.display_name.split(',')[0] || 'Unknown',
        displayName: r.display_name,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        type: r.type || 'unknown',
        address: r.display_name,
        country: r.address?.country,
      };

      this.cache.set(cacheKey, loc, 3600);
      return loc;
    } catch (e) {
      this.logger.error(`Reverse geocoding failed: ${(e as Error).message}`);
      throw new HttpException(
        'Reverse geocoding failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
