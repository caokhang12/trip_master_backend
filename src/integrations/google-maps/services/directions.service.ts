import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TravelMode as GoogleTravelMode,
  TravelRestriction,
  Language,
} from '@googlemaps/google-maps-services-js';
import { DirectionsResult, TravelMode, Waypoint } from '../types';
import { GoogleMapsBaseService } from '../google-maps-base.service';
import { RedisCacheService } from '../../../redis/redis-cache.service';
import { CacheService } from '../../../shared/services/cache.service';
import { APIThrottleService } from '../../../shared/services/api-throttle.service';

@Injectable()
export class DirectionsService extends GoogleMapsBaseService {
  private readonly cacheTtl: number;

  constructor(
    configService: ConfigService,
    redisService: RedisCacheService,
    cacheService: CacheService,
    throttleService: APIThrottleService,
  ) {
    super(configService, redisService, cacheService, throttleService);
    this.cacheTtl =
      this.configService.get<number>('googleMaps.cacheTtl.directions') || 3600;
  }

  async getDirections(params: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    waypoints?: Waypoint[];
    mode?: TravelMode;
    avoid?: 'tolls' | 'highways' | 'ferries';
    language?: string;
  }): Promise<DirectionsResult> {
    this.checkThrottle();

    const cacheKey = this.generateCacheKey('directions', params);

    const cached = await this.getCached<DirectionsResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.executeWithRetry(async () => {
      const response = await this.client.directions({
        params: {
          origin: params.origin,
          destination: params.destination,
          waypoints: params.waypoints?.map((wp) => wp),
          mode: (params.mode || 'driving') as GoogleTravelMode,
          avoid: params.avoid
            ? ([params.avoid] as TravelRestriction[])
            : undefined,
          key: this.apiKey,
          language: (params.language || 'en') as Language,
        },
        timeout: this.timeout,
      });

      const status = response.data.status as string;
      if (status !== 'OK' && status !== 'ZERO_RESULTS') {
        throw new Error(`API returned status: ${status}`);
      }

      return response.data;
    }, 'Directions API');

    const directionsResult: DirectionsResult = {
      routes: result.routes.map((route) => ({
        summary: route.summary,
        legs: route.legs.map((leg) => ({
          startAddress: leg.start_address,
          endAddress: leg.end_address,
          startLocation: {
            lat: leg.start_location.lat,
            lng: leg.start_location.lng,
          },
          endLocation: {
            lat: leg.end_location.lat,
            lng: leg.end_location.lng,
          },
          distance: {
            text: leg.distance.text,
            value: leg.distance.value,
          },
          duration: {
            text: leg.duration.text,
            value: leg.duration.value,
          },
          steps: leg.steps.map((step) => ({
            htmlInstructions: step.html_instructions,
            distance: {
              text: step.distance.text,
              value: step.distance.value,
            },
            duration: {
              text: step.duration.text,
              value: step.duration.value,
            },
            startLocation: {
              lat: step.start_location.lat,
              lng: step.start_location.lng,
            },
            endLocation: {
              lat: step.end_location.lat,
              lng: step.end_location.lng,
            },
            travelMode: step.travel_mode,
          })),
        })),
        overviewPolyline: route.overview_polyline.points,
        bounds: {
          northeast: {
            lat: route.bounds.northeast.lat,
            lng: route.bounds.northeast.lng,
          },
          southwest: {
            lat: route.bounds.southwest.lat,
            lng: route.bounds.southwest.lng,
          },
        },
        copyrights: route.copyrights,
        warnings: route.warnings,
      })),
    };

    await this.setCached(cacheKey, directionsResult, this.cacheTtl);

    return directionsResult;
  }
}
