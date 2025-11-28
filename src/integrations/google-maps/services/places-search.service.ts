import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Language } from '@googlemaps/google-maps-services-js';
import { GoogleMapsBaseService } from '../google-maps-base.service';
import { RedisCacheService } from '../../../redis/redis-cache.service';
import { CacheService } from '../../../shared/services/cache.service';
import { APIThrottleService } from '../../../shared/services/api-throttle.service';

export interface PlaceSummary {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  types?: string[];
  rating?: number;
  userRatingsTotal?: number;
  icon?: string;
}

export interface PlacesSearchResponse {
  query: string;
  total: number;
  results: PlaceSummary[];
  fromCache: boolean;
  tookMs: number;
  source: 'google' | 'cache';
}

export interface PlacesSearchQuery {
  query: string;
  lat?: number;
  lng?: number;
  radius?: number;
  limit?: number;
  language?: string;
}

@Injectable()
export class PlacesSearchService extends GoogleMapsBaseService {
  private readonly cacheTtl: number;

  constructor(
    configService: ConfigService,
    redisService: RedisCacheService,
    cacheService: CacheService,
    throttleService: APIThrottleService,
  ) {
    super(configService, redisService, cacheService, throttleService);
    this.cacheTtl =
      this.configService.get<number>('googleMaps.cacheTtl.placeDetails') ||
      86400;
  }

  async textSearch(
    dto: PlacesSearchQuery,
    userId?: string,
  ): Promise<PlacesSearchResponse> {
    const start = Date.now();

    this.checkThrottle(userId);

    const cacheKey = this.generateCacheKey('places_text_search', {
      query: dto.query.trim().toLowerCase(),
      lat: dto.lat,
      lng: dto.lng,
      radius: dto.radius,
      limit: dto.limit,
      language: dto.language || 'en',
    });

    // Check cache
    const cached = await this.getCached<PlacesSearchResponse>(cacheKey);
    if (cached) {
      return {
        ...cached,
        fromCache: true,
        tookMs: Date.now() - start,
        source: 'cache',
      };
    }

    // Fetch from API
    const result = await this.executeWithRetry(async () => {
      interface TextSearchParams {
        query: string;
        key: string;
        language?: Language;
        location?: string;
        radius?: number;
      }

      const params: TextSearchParams = {
        query: dto.query,
        key: this.apiKey,
        language: (dto.language || 'en') as Language,
      };

      if (dto.lat !== undefined && dto.lng !== undefined) {
        params.location = `${dto.lat},${dto.lng}`;
        params.radius = dto.radius || 5000;
      }

      const response = await this.client.textSearch({
        params,
        timeout: this.timeout,
      });

      const status = response.data.status as string;
      if (status !== 'OK' && status !== 'ZERO_RESULTS') {
        throw new Error(`API returned status: ${status}`);
      }

      return response.data.results || [];
    }, 'Places Text Search API');

    const results = result.slice(0, dto.limit || 10);

    const mapped: PlaceSummary[] = results.map((r) => ({
      placeId: r.place_id || '',
      name: r.name || 'Unknown',
      address: r.formatted_address || r.vicinity || '',
      lat: r.geometry?.location?.lat || 0,
      lng: r.geometry?.location?.lng || 0,
      types: r.types,
      rating: r.rating,
      userRatingsTotal: r.user_ratings_total,
      icon: r.icon,
    }));

    const response: PlacesSearchResponse = {
      query: dto.query,
      total: mapped.length,
      results: mapped,
      fromCache: false,
      tookMs: Date.now() - start,
      source: 'google',
    };

    // Cache the result
    await this.setCached(cacheKey, response, this.cacheTtl);

    return response;
  }
}
