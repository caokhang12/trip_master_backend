import { Injectable } from '@nestjs/common';
import { UserPreferencesEntity } from 'src/schemas/user-preferences.entity';
import { TripPreferencesEntity } from 'src/schemas/trip-preferences.entity';
import { TravelStyle } from 'src/shared/types/base-response.types';

export interface MergedPreferences {
  // Unified, merged view for AI consumption
  travelStyle?: TravelStyle[];
  interests?: string[];
  dietaryRestrictions?: string[];
  accessibilityNeeds?: string[];
  budgetRange?: { min: number; max: number; currency: string };
  // Trip dynamic extras
  dominantActivities?: string[];
  foodStyle?: string[];
  weatherAdjustedPreferences?: Record<string, unknown>;
  customPreferences?: Record<string, unknown>;
}

@Injectable()
export class PreferencesMergerService {
  /**
   * Merge following rule: trip-specific overrides when present; otherwise fallback to user preferences.
   * Never mutate the source objects.
   */
  merge(
    userPrefs?: UserPreferencesEntity | null,
    tripPrefs?: TripPreferencesEntity | null,
  ): MergedPreferences {
    const merged: MergedPreferences = {};

    // Long-term (master)
    if (userPrefs?.budgetRange)
      merged.budgetRange = { ...userPrefs.budgetRange };
    if (userPrefs?.travelStyle) merged.travelStyle = [...userPrefs.travelStyle];
    if (userPrefs?.interests) merged.interests = [...userPrefs.interests];
    if (userPrefs?.dietaryRestrictions)
      merged.dietaryRestrictions = [...userPrefs.dietaryRestrictions];
    if (userPrefs?.accessibilityNeeds)
      merged.accessibilityNeeds = [...userPrefs.accessibilityNeeds];

    // Trip-specific overrides/augments
    if (tripPrefs?.inferredStyle)
      merged.travelStyle = [...tripPrefs.inferredStyle];
    if (tripPrefs?.dominantActivities)
      merged.dominantActivities = [...tripPrefs.dominantActivities];
    if (tripPrefs?.foodStyle) merged.foodStyle = [...tripPrefs.foodStyle];
    if (tripPrefs?.weatherAdjustedPreferences)
      merged.weatherAdjustedPreferences = {
        ...tripPrefs.weatherAdjustedPreferences,
      } as Record<string, unknown>;
    if (tripPrefs?.customPreferences)
      merged.customPreferences = { ...tripPrefs.customPreferences } as Record<
        string,
        unknown
      >;

    return merged;
  }

  /**
   * Build a clean, human-readable section strings for prompts.
   */
  buildPromptSections(
    userPrefs?: UserPreferencesEntity | null,
    tripPrefs?: TripPreferencesEntity | null,
  ): { userSection: string; tripSection: string } {
    const userLines: string[] = [];
    if (userPrefs?.travelStyle?.length)
      userLines.push(`TravelStyle: ${userPrefs.travelStyle.join(', ')}`);
    if (userPrefs?.budgetRange)
      userLines.push(
        `BudgetRange: min=${userPrefs.budgetRange.min}, max=${userPrefs.budgetRange.max}, currency=${userPrefs.budgetRange.currency}`,
      );
    if (userPrefs?.interests?.length)
      userLines.push(`Interests: ${userPrefs.interests.join(', ')}`);
    if (userPrefs?.dietaryRestrictions?.length)
      userLines.push(
        `DietaryRestrictions: ${userPrefs.dietaryRestrictions.join(', ')}`,
      );
    if (userPrefs?.accessibilityNeeds?.length)
      userLines.push(
        `AccessibilityNeeds: ${userPrefs.accessibilityNeeds.join(', ')}`,
      );

    const tripLines: string[] = [];
    if (tripPrefs?.inferredStyle?.length)
      tripLines.push(`InferredStyle: ${tripPrefs.inferredStyle.join(', ')}`);
    if (tripPrefs?.dominantActivities?.length)
      tripLines.push(
        `DominantActivities: ${tripPrefs.dominantActivities.join(', ')}`,
      );
    if (tripPrefs?.foodStyle?.length)
      tripLines.push(`FoodStyle: ${tripPrefs.foodStyle.join(', ')}`);
    if (tripPrefs?.weatherAdjustedPreferences)
      tripLines.push(
        `WeatherAdjustedPreferences: ${JSON.stringify(tripPrefs.weatherAdjustedPreferences)}`,
      );
    if (tripPrefs?.customPreferences)
      tripLines.push(
        `CustomPreferences: ${JSON.stringify(tripPrefs.customPreferences)}`,
      );

    return {
      userSection:
        userLines.length > 0
          ? `USER LONG-TERM PREFERENCES (master):\n- ${userLines.join('\n- ')}`
          : 'USER LONG-TERM PREFERENCES (master): none provided',
      tripSection:
        tripLines.length > 0
          ? `TRIP-SPECIFIC PREFERENCES (dynamic):\n- ${tripLines.join('\n- ')}`
          : 'TRIP-SPECIFIC PREFERENCES (dynamic): none provided',
    };
  }
}
