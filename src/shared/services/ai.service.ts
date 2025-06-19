import { Injectable, Logger } from '@nestjs/common';

/**
 * Interface for AI cost estimation request
 */
export interface CostEstimationRequest {
  activity: string;
  description?: string;
  location: string;
  country: string;
  duration?: number;
  type: string;
}

/**
 * Interface for AI cost estimation response
 */
export interface CostEstimationResponse {
  amount: number;
  confidence: number;
  reasoning: string;
}

/**
 * AI service for cost estimation (placeholder implementation)
 * TODO: Integrate with OpenAI or other AI service for actual cost estimation
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  async estimateActivityCost(
    activity: any,
    country: string,
    currency: string,
  ): Promise<{
    estimatedCost: number;
    category: string;
    breakdown?: Record<string, number>;
  }> {
    const request: CostEstimationRequest = {
      activity: activity.title,
      description: activity.description,
      location: activity.location || country,
      country: this.getCountryCode(country),
      duration: activity.duration,
      type: this.mapActivityType(activity.type),
    };

    const estimation = await this.estimateActivityCostInternal(request);

    // Convert to target currency if needed (placeholder - would use currency service)
    const convertedAmount = estimation.amount; // TODO: implement currency conversion

    return {
      estimatedCost: convertedAmount,
      category: request.type,
      breakdown: {
        [request.type]: convertedAmount,
      },
    };
  }

  /**
   * Internal method for cost estimation
   */
  private async estimateActivityCostInternal(
    request: CostEstimationRequest,
  ): Promise<CostEstimationResponse> {
    this.logger.log(
      `Estimating cost for activity: ${request.activity} in ${request.location}`,
    );

    // Base cost estimates by activity type (in USD)
    const baseCosts = {
      transport: 15,
      food: 25,
      accommodation: 80,
      activity: 20,
      shopping: 30,
      miscellaneous: 10,
    };

    // Country-specific multipliers
    const countryMultipliers = {
      VN: 0.3, // Vietnam is relatively inexpensive
      TH: 0.4, // Thailand
      US: 1.0, // Baseline
      JP: 1.5, // Japan is expensive
      CH: 2.0, // Switzerland is very expensive
      GB: 1.3, // UK
      FR: 1.2, // France
      DE: 1.1, // Germany
    };

    // Activity-specific adjustments
    const activityAdjustments = this.getActivityAdjustments(request);

    const baseCost = baseCosts[request.type] || baseCosts.miscellaneous;
    const countryMultiplier = countryMultipliers[request.country] || 0.7;
    const durationMultiplier = this.getDurationMultiplier(
      request.duration,
      request.type,
    );

    const estimatedAmount =
      baseCost *
      countryMultiplier *
      durationMultiplier *
      activityAdjustments.multiplier;

    return {
      amount: Math.round(estimatedAmount * 100) / 100,
      confidence: 0.7,
      reasoning: `Base cost for ${request.type} in ${request.country}: $${baseCost} × ${countryMultiplier} (country) × ${durationMultiplier} (duration) × ${activityAdjustments.multiplier} (activity specific) = $${estimatedAmount.toFixed(2)}. ${activityAdjustments.reasoning}`,
    };
  }

  /**
   * Get activity-specific adjustments based on keywords
   */
  private getActivityAdjustments(request: CostEstimationRequest): {
    multiplier: number;
    reasoning: string;
  } {
    const content =
      `${request.activity} ${request.description || ''}`.toLowerCase();

    // High-end keywords
    if (
      content.includes('luxury') ||
      content.includes('premium') ||
      content.includes('high-end') ||
      content.includes('five-star') ||
      content.includes('michelin')
    ) {
      return { multiplier: 2.5, reasoning: 'Premium/luxury service detected.' };
    }

    // Mid-range keywords
    if (
      content.includes('guided') ||
      content.includes('private') ||
      content.includes('tour')
    ) {
      return {
        multiplier: 1.5,
        reasoning: 'Guided or private service detected.',
      };
    }

    // Budget keywords
    if (
      content.includes('budget') ||
      content.includes('cheap') ||
      content.includes('free') ||
      content.includes('street food') ||
      content.includes('local')
    ) {
      return { multiplier: 0.6, reasoning: 'Budget or local option detected.' };
    }

    // Museum/attraction keywords
    if (
      content.includes('museum') ||
      content.includes('temple') ||
      content.includes('park') ||
      content.includes('monument') ||
      content.includes('attraction')
    ) {
      return {
        multiplier: 0.8,
        reasoning: 'Standard attraction/museum pricing.',
      };
    }

    // Food-specific adjustments
    if (request.type === 'food') {
      if (content.includes('restaurant') || content.includes('dining')) {
        return {
          multiplier: 1.3,
          reasoning:
            'Restaurant dining typically costs more than casual meals.',
        };
      }
      if (
        content.includes('street') ||
        content.includes('market') ||
        content.includes('vendor')
      ) {
        return {
          multiplier: 0.5,
          reasoning: 'Street food/market food is typically very affordable.',
        };
      }
    }

    // Transport-specific adjustments
    if (request.type === 'transport') {
      if (
        content.includes('taxi') ||
        content.includes('uber') ||
        content.includes('grab')
      ) {
        return {
          multiplier: 1.2,
          reasoning: 'Private transport typically costs more.',
        };
      }
      if (
        content.includes('bus') ||
        content.includes('metro') ||
        content.includes('public')
      ) {
        return {
          multiplier: 0.4,
          reasoning: 'Public transport is typically very affordable.',
        };
      }
      if (content.includes('flight') || content.includes('plane')) {
        return {
          multiplier: 8.0,
          reasoning: 'Flight costs are significantly higher.',
        };
      }
    }

    return { multiplier: 1.0, reasoning: 'Standard pricing applied.' };
  }

  /**
   * Calculate duration multiplier based on activity type and duration
   */
  private getDurationMultiplier(duration: number = 120, type: string): number {
    if (!duration) return 1.0;

    const hours = duration / 60;

    switch (type) {
      case 'accommodation':
        return 1.0;

      case 'food':
        if (hours < 1) return 0.7;
        if (hours > 2) return 1.3;
        return 1.0;

      case 'transport':
        return Math.sqrt(hours);

      case 'activity':
      case 'shopping':
      case 'miscellaneous':
        return Math.min(hours / 2, 2.0);

      default:
        return 1.0;
    }
  }

  private mapActivityType(type?: string): string {
    if (!type) return 'miscellaneous';

    const typeMap: Record<string, string> = {
      dining: 'food',
      sightseeing: 'activity',
      transportation: 'transport',
      accommodation: 'accommodation',
      shopping: 'shopping',
    };

    return typeMap[type.toLowerCase()] || 'miscellaneous';
  }

  private getCountryCode(country: string): string {
    const countryMap: Record<string, string> = {
      Vietnam: 'VN',
      Thailand: 'TH',
      'United States': 'US',
      Japan: 'JP',
      Switzerland: 'CH',
      'United Kingdom': 'GB',
      France: 'FR',
      Germany: 'DE',
    };

    return countryMap[country] || 'US';
  }
}
