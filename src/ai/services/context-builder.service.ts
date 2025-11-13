import { Injectable } from '@nestjs/common';
import { PromptContext } from '../interfaces/ai.interface';
import { PreferencesService } from 'src/preferences/preferences.service';
import { PreferencesMergerService } from 'src/preferences/preferences-merger.service';

@Injectable()
export class ContextBuilderService {
  constructor(
    private readonly preferencesService: PreferencesService,
    private readonly merger: PreferencesMergerService,
  ) {}

  /**
   * Build PromptContext, loading and merging user + trip preferences.
   * If tripId is not provided, only user preferences are used.
   */
  async build(
    base: {
      country: string;
      season?: string;
      budgetGuidelines?: string;
    },
    userId: string,
    tripId?: string,
  ): Promise<
    PromptContext & {
      userPreferencesSection: string;
      tripPreferencesSection: string;
      mergedPreferences?: Record<string, unknown>;
    }
  > {
    const userPrefs = await this.preferencesService.getUserPreferences(userId);
    const tripPrefs = tripId
      ? await this.preferencesService.getTripPreferences(tripId, userId)
      : null;

    const merged = this.merger.merge(
      userPrefs ?? undefined,
      tripPrefs ?? undefined,
    );
    const sections = this.merger.buildPromptSections(userPrefs, tripPrefs);

    return {
      country: base.country,
      season: base.season,
      budgetGuidelines: base.budgetGuidelines,
      userPreferencesSection: sections.userSection,
      tripPreferencesSection: sections.tripSection,
      mergedPreferences: merged as unknown as Record<string, unknown>,
    };
  }
}
