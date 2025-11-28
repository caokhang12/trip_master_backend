import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TravelMode as GoogleTravelMode } from '@googlemaps/google-maps-services-js';
import { DistanceMatrixResult, TravelMode } from '../types';
import { GoogleMapsBaseService } from '../google-maps-base.service';
import { RedisCacheService } from '../../../redis/redis-cache.service';
import { CacheService } from '../../../shared/services/cache.service';
import { APIThrottleService } from '../../../shared/services/api-throttle.service';

@Injectable()
export class DistanceMatrixService extends GoogleMapsBaseService {
  private readonly cacheTtl: number;

  constructor(
    configService: ConfigService,
    redisService: RedisCacheService,
    cacheService: CacheService,
    throttleService: APIThrottleService,
  ) {
    super(configService, redisService, cacheService, throttleService);
    this.cacheTtl =
      this.configService.get<number>('googleMaps.cacheTtl.distanceMatrix') ||
      600;
  }

  async getDistanceMatrix(params: {
    origins: Array<{ lat: number; lng: number }>;
    destinations: Array<{ lat: number; lng: number }>;
    mode?: TravelMode;
    language?: string;
  }): Promise<DistanceMatrixResult> {
    this.checkThrottle();

    const cacheKey = this.generateCacheKey('distance_matrix', params);

    const cached = await this.getCached<DistanceMatrixResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.executeWithRetry(async () => {
      const response = await this.client.distancematrix({
        params: {
          origins: params.origins,
          destinations: params.destinations,
          mode: (params.mode || 'driving') as GoogleTravelMode,
          key: this.apiKey,
          language: params.language || 'en',
        },
        timeout: this.timeout,
      });

      const status = response.data.status as string;
      if (status !== 'OK' && status !== 'ZERO_RESULTS') {
        throw new Error(`API returned status: ${status}`);
      }

      return response.data;
    }, 'Distance Matrix API');

    const distanceMatrixResult: DistanceMatrixResult = {
      originAddresses: result.origin_addresses,
      destinationAddresses: result.destination_addresses,
      rows: result.rows.map((row) => ({
        elements: row.elements.map((element) => ({
          status: element.status,
          distance: element.distance
            ? {
                text: element.distance.text,
                value: element.distance.value,
              }
            : undefined,
          duration: element.duration
            ? {
                text: element.duration.text,
                value: element.duration.value,
              }
            : undefined,
          durationInTraffic: element.duration_in_traffic
            ? {
                text: element.duration_in_traffic.text,
                value: element.duration_in_traffic.value,
              }
            : undefined,
        })),
      })),
    };

    await this.setCached(cacheKey, distanceMatrixResult, this.cacheTtl);

    return distanceMatrixResult;
  }
}
