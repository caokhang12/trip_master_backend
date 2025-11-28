import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Language } from '@googlemaps/google-maps-services-js';
import { PlaceDetailsResult } from '../types';
import { GoogleMapsBaseService } from '../google-maps-base.service';
import { RedisCacheService } from '../../../redis/redis-cache.service';
import { CacheService } from '../../../shared/services/cache.service';
import { APIThrottleService } from '../../../shared/services/api-throttle.service';

@Injectable()
export class PlacesService extends GoogleMapsBaseService {
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

  async getPlaceDetails(
    placeId: string,
    language?: string,
  ): Promise<PlaceDetailsResult> {
    this.checkThrottle();

    const cacheKey = this.generateCacheKey('place_details', {
      placeId,
      language: language || 'en',
    });

    // Check cache
    const cached = await this.getCached<PlaceDetailsResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const result = await this.executeWithRetry(async () => {
      const response = await this.client.placeDetails({
        params: {
          place_id: placeId,
          key: this.apiKey,
          language: (language || 'en') as Language,
        },
        timeout: this.timeout,
      });

      const status = response.data.status as string;
      if (status !== 'OK' && status !== 'ZERO_RESULTS') {
        throw new Error(`API returned status: ${status}`);
      }

      return response.data.result;
    }, 'Place Details API');

    // Transform to our format
    const placeDetails: PlaceDetailsResult = {
      placeId: result.place_id || '',
      name: result.name || '',
      formattedAddress: result.formatted_address || '',
      location: {
        lat: result.geometry?.location.lat || 0,
        lng: result.geometry?.location.lng || 0,
      },
      rating: result.rating,
      userRatingsTotal: result.user_ratings_total,
      priceLevel: result.price_level,
      types: result.types,
      openingHours: result.opening_hours
        ? {
            openNow: result.opening_hours.open_now,
            weekdayText: result.opening_hours.weekday_text,
          }
        : undefined,
      photos: result.photos?.map((photo) => ({
        photoReference: photo.photo_reference,
        height: photo.height,
        width: photo.width,
      })),
      internationalPhoneNumber: result.international_phone_number,
      website: result.website,
      businessStatus: result.business_status,
      utcOffset: result.utc_offset,
      vicinity: result.vicinity,
    };

    // Cache the result
    await this.setCached(cacheKey, placeDetails, this.cacheTtl);

    return placeDetails;
  }
}
