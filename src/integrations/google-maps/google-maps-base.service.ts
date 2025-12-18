import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@googlemaps/google-maps-services-js';
import { RedisCacheService } from '../../redis/redis-cache.service';
import { CacheService } from '../../shared/services/cache.service';
import { APIThrottleService } from '../../shared/services/api-throttle.service';
import * as crypto from 'crypto';

@Injectable()
export abstract class GoogleMapsBaseService {
  protected readonly logger: Logger;
  protected readonly client: Client;
  protected readonly apiKey: string;
  protected readonly defaultRegion: string;
  protected readonly timeout: number;
  protected readonly maxRetries: number;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly redisService: RedisCacheService,
    protected readonly cacheService: CacheService,
    protected readonly throttleService: APIThrottleService,
  ) {
    this.logger = new Logger(this.constructor.name);
    this.client = new Client({});

    this.apiKey = this.configService.get<string>('googleMaps.apiKey') || '';

    this.defaultRegion =
      this.configService.get<string>('googleMaps.defaultRegion') || 'US';
    this.timeout = this.configService.get<number>('googleMaps.timeout') || 5000;
    this.maxRetries =
      this.configService.get<number>('googleMaps.maxRetries') || 2;

    if (!this.apiKey) {
      this.logger.warn('Google Maps API key not configured');
    }
  }

  /**
   * Generate cache key from parameters
   */
  protected generateCacheKey(
    prefix: string,
    params: Record<string, unknown>,
  ): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = params[key];
          return acc;
        },
        {} as Record<string, unknown>,
      );

    const paramsString = JSON.stringify(sortedParams);
    const hash = crypto.createHash('md5').update(paramsString).digest('hex');
    return `google_maps:${prefix}:${hash}`;
  }

  /**
   * Dual-layer caching: Redis first, then in-memory
   */
  protected async getCached<T>(cacheKey: string): Promise<T | null> {
    try {
      // Try Redis first
      const redisCached = await this.redisService.get<T>(cacheKey);
      if (redisCached) {
        this.logger.debug(`Cache hit (Redis): ${cacheKey}`);
        return redisCached;
      }

      // Fallback to in-memory cache
      const memCached = this.cacheService.get<T>(cacheKey);
      if (memCached) {
        this.logger.debug(`Cache hit (Memory): ${cacheKey}`);
        return memCached;
      }

      return null;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Cache read error: ${err.message}`);
      return null;
    }
  }

  /**
   * Store in both caches
   */
  protected async setCached<T>(
    cacheKey: string,
    data: T,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      // Store in Redis
      await this.redisService.set(cacheKey, data, ttlSeconds);

      // Store in memory
      this.cacheService.set(cacheKey, data, ttlSeconds * 1000);

      this.logger.debug(`Cached: ${cacheKey} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Cache write error: ${err.message}`);
    }
  }

  /**
   * Check API throttling limits
   */
  protected checkThrottle(userId?: string): void {
    const allowed = this.throttleService.checkAndLog('google_places', userId);
    if (!allowed) {
      throw new HttpException(
        'Google Maps API quota exceeded. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Handle Google Maps API errors
   */
  protected handleApiError(error: unknown, context: string): never {
    if (error instanceof Error) {
      this.logger.error(`${context} failed: ${error.message}`, error.stack);

      // Check for specific Google API error responses
      if ('response' in error && error.response) {
        const response = error.response as {
          data?: { status?: string; error_message?: string };
        };
        const status = response.data?.status;
        const errorMessage = response.data?.error_message;

        switch (status) {
          case 'ZERO_RESULTS':
            throw new HttpException(
              'No results found for the given parameters',
              HttpStatus.NOT_FOUND,
            );
          case 'INVALID_REQUEST':
            throw new HttpException(
              errorMessage || 'Invalid request parameters',
              HttpStatus.BAD_REQUEST,
            );
          case 'OVER_QUERY_LIMIT':
            throw new HttpException(
              'Google Maps API quota exceeded',
              HttpStatus.TOO_MANY_REQUESTS,
            );
          case 'REQUEST_DENIED':
            throw new HttpException(
              'Request denied. Please check API key configuration',
              HttpStatus.FORBIDDEN,
            );
          case 'UNKNOWN_ERROR':
            throw new HttpException(
              'Google Maps API error. Please try again',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
      }

      throw new HttpException(
        `Google Maps API error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    throw new HttpException(
      'Unknown error occurred',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * Execute API call with retry logic
   */
  protected async executeWithRetry<T>(
    apiCall: () => Promise<T>,
    context: string,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 1s, 2s, 4s...

          const delay = Math.pow(2, attempt - 1) * 1000;
          this.logger.debug(
            `Retry ${attempt}/${this.maxRetries} after ${delay}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        return await apiCall();
      } catch (error) {
        lastError = error;
        const err = error as Error;
        this.logger.warn(
          `${context} attempt ${attempt + 1} failed: ${err.message}`,
        );
      }
    }

    this.handleApiError(lastError, context);
  }
}
