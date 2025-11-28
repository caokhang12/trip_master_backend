import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Language } from '@googlemaps/google-maps-services-js';
import { GeocodingResult } from '../types';
import { GoogleMapsBaseService } from '../google-maps-base.service';
import { RedisCacheService } from '../../../redis/redis-cache.service';
import { CacheService } from '../../../shared/services/cache.service';
import { APIThrottleService } from '../../../shared/services/api-throttle.service';

@Injectable()
export class ReverseGeocodingService extends GoogleMapsBaseService {
  private readonly cacheTtl: number;

  constructor(
    configService: ConfigService,
    redisService: RedisCacheService,
    cacheService: CacheService,
    throttleService: APIThrottleService,
  ) {
    super(configService, redisService, cacheService, throttleService);
    this.cacheTtl =
      this.configService.get<number>('googleMaps.cacheTtl.reverseGeocoding') ||
      86400;
  }

  async reverseGeocode(
    lat: number,
    lng: number,
    language?: string,
  ): Promise<GeocodingResult> {
    this.checkThrottle();

    const cacheKey = this.generateCacheKey('reverse_geocode', {
      lat,
      lng,
      language: language || 'en',
    });

    const cached = await this.getCached<GeocodingResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.executeWithRetry(async () => {
      const response = await this.client.reverseGeocode({
        params: {
          latlng: { lat, lng },
          key: this.apiKey,
          language: (language || 'en') as Language,
        },
        timeout: this.timeout,
      });

      const status = response.data.status as string;
      if (status !== 'OK' && status !== 'ZERO_RESULTS') {
        throw new Error(`API returned status: ${status}`);
      }

      return response.data.results[0];
    }, 'Reverse Geocoding API');

    const geocodingResult: GeocodingResult = {
      formattedAddress: result.formatted_address,
      location: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      },
      locationType: result.geometry.location_type,
      placeId: result.place_id,
      addressComponents: result.address_components?.map((component) => ({
        longName: component.long_name,
        shortName: component.short_name,
        types: component.types,
      })),
    };

    await this.setCached(cacheKey, geocodingResult, this.cacheTtl);

    return geocodingResult;
  }
}
