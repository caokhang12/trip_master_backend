import { Injectable, Logger } from '@nestjs/common';
import {
  PlacesSearchService,
  type PlaceSummary,
} from 'src/integrations/google-maps/services/places-search.service';
import { PlacesService } from 'src/integrations/google-maps/services/places.service';
import type {
  GeneratedActivity,
  GeneratedItinerary,
} from 'src/ai/dto/generated-itinerary.dto';
import type { PlaceDetailsResult } from 'src/integrations/google-maps/types';

export type ActivityPoiSnapshot = NonNullable<GeneratedActivity['poi']>;

@Injectable()
export class PoiGroundingService {
  private readonly logger = new Logger(PoiGroundingService.name);

  constructor(
    private readonly placesSearchService: PlacesSearchService,
    private readonly placesService: PlacesService,
  ) {}

  private snapshotFromDetails(
    details: PlaceDetailsResult,
  ): ActivityPoiSnapshot {
    return {
      placeId: details.placeId,
      name: details.name,
      formattedAddress: details.formattedAddress,
      location: {
        lat: details.location.lat,
        lng: details.location.lng,
      },
      rating: details.rating,
      userRatingsTotal: details.userRatingsTotal,
      priceLevel: details.priceLevel,
      types: details.types,
      openingHours: details.openingHours,
    };
  }

  private snapshotFromSummary(summary: PlaceSummary): ActivityPoiSnapshot {
    return {
      placeId: summary.placeId,
      name: summary.name,
      formattedAddress: summary.address,
      location: {
        lat: summary.lat,
        lng: summary.lng,
      },
      rating: summary.rating,
      userRatingsTotal: summary.userRatingsTotal,
      types: summary.types,
    };
  }

  private async resolveDestinationCenter(
    destination: string,
    language?: string,
  ): Promise<{ lat: number; lng: number } | null> {
    try {
      const search = await this.placesSearchService.textSearch({
        query: destination,
        limit: 1,
        language,
      });

      const first = search.results[0];
      if (!first) return null;

      return {
        lat: first.lat,
        lng: first.lng,
      };
    } catch {
      this.logger.warn(`resolveDestinationCenter failed: ${destination}`);
      return null;
    }
  }

  private buildActivityQuery(
    destination: string,
    activity: GeneratedActivity,
  ): string {
    const title = activity.title?.trim();
    if (!title) return destination;
    return `${title} in ${destination}`;
  }

  async groundActivity(
    destination: string,
    activity: GeneratedActivity,
    options?: {
      language?: string;
      center?: { lat: number; lng: number } | null;
      radiusMeters?: number;
      mode?: 'thin' | 'full';
    },
  ): Promise<ActivityPoiSnapshot | null> {
    const query = this.buildActivityQuery(destination, activity);
    const language = options?.language;
    const center = options?.center;

    try {
      const search = await this.placesSearchService.textSearch(
        {
          query,
          lat: center?.lat,
          lng: center?.lng,
          radius: options?.radiusMeters ?? 8000,
          limit: 5,
          language,
        },
        undefined,
      );

      const candidate = search.results[0];
      if (!candidate?.placeId) return null;

      if (options?.mode === 'thin') {
        return this.snapshotFromSummary(candidate);
      }

      const details = await this.placesService.getPlaceDetails(
        candidate.placeId,
        language,
      );

      if (!details?.placeId) return null;
      return this.snapshotFromDetails(details);
    } catch {
      return null;
    }
  }

  async groundItinerary(
    destination: string,
    itinerary: GeneratedItinerary,
    options?: {
      language?: string;
      radiusMeters?: number;
      maxActivitiesToGroundPerDay?: number;
      mode?: 'thin' | 'full';
    },
  ): Promise<GeneratedItinerary> {
    const center = await this.resolveDestinationCenter(
      destination,
      options?.language,
    );

    const maxPerDay = options?.maxActivitiesToGroundPerDay;

    for (const day of itinerary.days) {
      const activities = day.activities ?? [];
      const limit =
        typeof maxPerDay === 'number' && maxPerDay > 0
          ? Math.min(maxPerDay, activities.length)
          : activities.length;

      for (let i = 0; i < activities.length; i++) {
        if (i >= limit) break;

        const act = activities[i];
        const poi = await this.groundActivity(destination, act, {
          language: options?.language,
          center,
          radiusMeters: options?.radiusMeters,
          mode: options?.mode,
        });

        act.poi = poi ?? null;
      }
    }

    return itinerary;
  }
}
