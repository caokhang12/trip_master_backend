import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, Language } from '@googlemaps/google-maps-services-js';
import { CacheService } from '../../shared/services/cache.service';
import { RedisCacheService } from '../../shared/services/redis-cache.service';
import { PlacesQuery } from '../dto/places-search.dto';
import { APIThrottleService } from '../../shared/services/api-throttle.service';

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

@Injectable()
export class GooglePlacesService {
  private readonly logger = new Logger(GooglePlacesService.name);
  private readonly client: Client = new Client({});
  private readonly apiKey: string;
  private readonly ttlSeconds: number;

  constructor(
    private readonly config: ConfigService,
    private readonly inMemoryCache: CacheService,
    private readonly redisCache: RedisCacheService,
    private readonly throttle: APIThrottleService,
  ) {
    this.apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY') || '';
    this.ttlSeconds = parseInt(
      this.config.get<string>('GOOGLE_PLACES_TTL') || '900',
      10,
    ); // default 15m
  }

  private buildCacheKey(dto: PlacesQuery) {
    const parts = [
      dto.query.trim().toLowerCase(),
      dto.lat,
      dto.lng,
      dto.radius,
      dto.limit,
    ];
    return `places_search_${parts.filter((v) => v !== undefined).join('_')}`;
  }

  async textSearch(
    dto: PlacesQuery,
    userId?: string,
  ): Promise<PlacesSearchResponse> {
    if (!this.apiKey) {
      throw new HttpException(
        'Google Places API key not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const start = Date.now();
    const cacheKey = this.buildCacheKey(dto);

    // Try Redis cache first
    const redisCached =
      await this.redisCache.get<PlacesSearchResponse>(cacheKey);
    if (redisCached) {
      return {
        ...redisCached,
        fromCache: true,
        tookMs: Date.now() - start,
        source: 'cache',
      };
    }
    // Fallback in-memory cache
    const memCached = this.inMemoryCache.get<PlacesSearchResponse>(cacheKey);
    if (memCached) {
      return {
        ...memCached,
        fromCache: true,
        tookMs: Date.now() - start,
        source: 'cache',
      };
    }

    // Throttle check
    const allowed = this.throttle.checkAndLog('google_places', userId);
    if (!allowed) {
      throw new HttpException(
        'Google Places quota exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      interface TextSearchParams {
        query: string;
        key: string;
        language?: Language;
        location?: string;
        radius?: number;
      }
      interface GooglePlaceRaw {
        place_id?: string;
        name?: string;
        formatted_address?: string;
        vicinity?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
        types?: string[];
        rating?: number;
        user_ratings_total?: number;
        icon?: string;
      }
      const params: TextSearchParams = {
        query: dto.query,
        key: this.apiKey,
        language: Language.en,
      };
      if (dto.lat !== undefined && dto.lng !== undefined) {
        params.location = `${dto.lat},${dto.lng}`;
        params.radius = dto.radius || 5000; // biasing
      }
      const resp = await this.client.textSearch({ params, timeout: 2000 });
      const rawData: unknown = resp.data?.results || [];
      const raw: GooglePlaceRaw[] = Array.isArray(rawData)
        ? (rawData as GooglePlaceRaw[])
        : [];
      const results = raw.slice(0, dto.limit || 10);

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

      // Store in caches (Redis + in-memory for ultra-fast subsequent hits until process restart)
      await this.redisCache.set(cacheKey, response, this.ttlSeconds);
      this.inMemoryCache.set(cacheKey, response, this.ttlSeconds * 1000);

      return response;
    } catch (e) {
      this.logger.error(`Places search failed: ${(e as Error).message}`);
      throw new HttpException('Places search failed', HttpStatus.BAD_GATEWAY);
    }
  }
}
