import { Injectable } from '@nestjs/common';
import { PromptContext, AIGenerationRequest } from '../interfaces/ai.interface';

/**
 * Service for building AI prompts with country-specific optimization
 */
@Injectable()
export class PromptBuilderService {
  /**
   * Build system prompt for OpenAI with country context
   */
  buildSystemPrompt(context: PromptContext): string {
    const basePrompt = `You are an expert travel planner specializing in ${context.country}.`;

    const culturalSection = context.culturalContext
      ? `\n\nCultural Context:\n${context.culturalContext}`
      : '';

    const expertiseSection = context.localExpertise
      ? `\n\nLocal Expertise:\n${context.localExpertise}`
      : '';

    const budgetSection = context.budgetGuidelines
      ? `\n\nBudget Guidelines:\n${context.budgetGuidelines}`
      : '';

    const seasonalSection = context.season
      ? `\n\nSeasonal Context: Currently ${context.season} season`
      : '';

    const jsonFormat = `

CRITICAL: You must respond with valid JSON only. No additional text before or after the JSON.

Generate a concise travel itinerary in this exact JSON structure:
{
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "name": "Activity name",
          "description": "Brief description (max 100 chars)",
          "location": "Specific location",
          "duration": 120,
          "estimatedCost": 50000,
          "category": "sightseeing",
          "timeSlot": "morning",
          "localTips": ["tip 1", "tip 2"],
          "bookingRequired": false
        }
      ],
      "dailyBudget": 200000,
      "transportationNotes": "Brief transport info"
    }
  ],
  "summary": {
    "totalDays": 5,
    "highlights": ["highlight 1", "highlight 2", "highlight 3"],
    "budgetBreakdown": {
      "accommodation": 1000000,
      "food": 500000,
      "activities": 300000,
      "transportation": 200000,
      "total": 2000000
    },
    "bestTimeToVisit": "Brief seasonal recommendation",
    "packingRecommendations": ["item 1", "item 2", "item 3"]
  },
  "culturalContext": {
    "country": "${context.country}",
    "currency": "Currency info",
    "tipping": "Brief tipping customs",
    "safetyTips": ["safety tip 1", "safety tip 2"]
  },
  "totalEstimatedCost": 2000000,
  "currency": "VND"
}

JSON FORMATTING REQUIREMENTS:
- Response must be valid JSON only - no markdown, no explanations
- Use double quotes for all strings
- Close all objects and arrays properly
- Keep descriptions brief to avoid truncation
- Complete all sections without truncating

CONTENT REQUIREMENTS:
- Include 3-5 activities per day maximum
- Keep descriptions under 100 characters
- Focus on authentic local experiences
- Include practical cost estimates in local currency
- Balance must-see attractions with local experiences
- Provide brief but useful tips`;

    return (
      basePrompt +
      culturalSection +
      expertiseSection +
      budgetSection +
      seasonalSection +
      jsonFormat
    );
  }

  /**
   * Build user prompt for specific trip request
   */
  buildUserPrompt(request: AIGenerationRequest): string {
    const days = Math.ceil(
      (new Date(request.endDate).getTime() -
        new Date(request.startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const baseRequest = `Create a ${days}-day itinerary for ${request.travelers} travelers visiting ${request.destination}, ${request.country} from ${request.startDate} to ${request.endDate}.`;

    const preferences = `
Travel Details:
- Travel Style: ${request.preferences.travelStyle}
- Total Budget: ${request.budget} ${request.currency}
- Group Type: ${request.preferences.groupType || 'not specified'}
- Activity Level: ${request.preferences.activityLevel || 'moderate'}
- Interests: ${request.preferences.interests.join(', ')}`;

    const restrictions = request.preferences.dietaryRestrictions
      ? `\n- Dietary Restrictions: ${request.preferences.dietaryRestrictions.join(', ')}`
      : '';

    const accessibility = request.preferences.accessibilityNeeds
      ? `\n- Accessibility Needs: ${request.preferences.accessibilityNeeds.join(', ')}`
      : '';

    const transport = request.preferences.transportPreference
      ? `\n- Transport Preference: ${request.preferences.transportPreference}`
      : '';

    const accommodation = request.accommodationLocation
      ? `\n- Accommodation Location: ${request.accommodationLocation}`
      : '';

    const specialRequests = this.buildSpecialRequests(request);

    return (
      baseRequest +
      preferences +
      restrictions +
      accessibility +
      transport +
      accommodation +
      specialRequests +
      '\n\nGenerate a comprehensive, culturally-rich itinerary with authentic local experiences.'
    );
  }

  /**
   * Build prompt for location suggestions
   */
  buildSuggestionsPrompt(params: {
    location: string;
    travelStyle: string;
    budget: number;
    interests?: string[];
  }): string {
    return `Suggest 5-8 authentic activities and experiences for ${params.location} that match:

Requirements:
- Travel style: ${params.travelStyle}
- Budget range: ${params.budget} (local currency)
- Interests: ${params.interests?.join(', ') || 'general exploration'}

Focus on:
- Authentic local experiences over tourist traps
- Cultural immersion opportunities
- Hidden gems and local secrets
- Activities that locals would recommend
- Mix of free and paid experiences
- Seasonal appropriateness

Return in this exact JSON format:
{
  "suggestions": [
    {
      "name": "Activity or experience name",
      "description": "Detailed description with cultural context",
      "estimatedCost": 50000,
      "duration": 120,
      "category": "cultural",
      "reasonForSuggestion": "Why this perfectly matches the traveler's style and interests",
      "localTips": ["insider tip 1", "practical advice 2"],
      "bestTimeToVisit": "Time of day or season recommendation"
    }
  ]
}`;
  }

  /**
   * Build prompt for cost estimation
   */
  buildCostEstimationPrompt(params: {
    destination: string;
    activityType: string;
    duration: number;
    travelers: number;
    travelStyle: string;
  }): string {
    return `Provide detailed cost estimation for ${params.activityType} activities in ${params.destination}.

Parameters:
- Activity type: ${params.activityType}
- Duration: ${params.duration} days
- Number of travelers: ${params.travelers}
- Travel style: ${params.travelStyle}

Provide estimates for different budget levels and include local cost factors.

Return in this exact JSON format:
{
  "minCost": 500000,
  "maxCost": 2000000,
  "averageCost": 1000000,
  "currency": "VND",
  "breakdown": {
    "accommodation": 400000,
    "food": 300000,
    "activities": 200000,
    "transportation": 100000,
    "shopping": 0,
    "miscellaneous": 0,
    "total": 1000000
  },
  "notes": [
    "Costs vary significantly during peak season (20-30% higher)",
    "Budget travelers can reduce costs by choosing local accommodations",
    "Luxury options available at 2-3x the average cost",
    "Booking activities in advance may offer discounts"
  ],
  "localFactors": [
    "Local currency and exchange considerations",
    "Tipping customs and expectations",
    "Seasonal price variations",
    "Local vs tourist pricing differences"
  ]
}`;
  }

  /**
   * Build Vietnam-specific cultural context
   */
  buildVietnamCulturalContext(
    region: 'north' | 'central' | 'south',
    season: string,
  ): string {
    const regionalContext = this.getVietnameseRegionalContext(region);
    const seasonalContext = this.getVietnameseSeasonalContext(season);

    return `Vietnam ${region} region expertise:
${regionalContext}

Seasonal context (${season}):
${seasonalContext}

Cultural Guidelines:
- Vietnamese people value respect for elders and family
- Remove shoes when entering homes and some restaurants
- Dress modestly in temples and pagodas
- Bargaining is expected in markets but be polite
- Tipping is not mandatory but appreciated (5-10% in restaurants)
- Learn basic Vietnamese greetings - locals appreciate the effort
- Be patient with language barriers and use translation apps
- Avoid pointing with your finger, use your whole hand
- Business cards should be received with both hands`;
  }

  /**
   * Build country-specific budget guidelines
   */
  buildBudgetGuidelines(
    totalBudget: number,
    currency: string,
    country: string,
  ): string {
    const costLevel = this.getCountryCostLevel(country);
    const dailyBudgetRanges = this.getDailyBudgetRanges(country, currency);

    return `Budget Context for ${country}:
- Total Budget: ${totalBudget} ${currency}
- Cost Level: ${costLevel}
- Daily Budget Ranges: ${dailyBudgetRanges}

Budget Allocation Recommendations:
- Accommodation: 30-40% of total budget
- Food & Dining: 25-30% of total budget
- Activities & Attractions: 20-25% of total budget
- Transportation: 10-15% of total budget
- Shopping & Souvenirs: 5-10% of total budget
- Emergency Fund: 5% of total budget

Money-Saving Tips:
- Book accommodations in advance for better rates
- Eat where locals eat for authentic and affordable meals
- Use public transportation or walking when possible
- Look for combination tickets for multiple attractions
- Shop at local markets rather than tourist shops`;
  }

  /**
   * Build special requests based on preferences
   */
  private buildSpecialRequests(request: AIGenerationRequest): string {
    const requests: string[] = [];

    if (request.preferences.travelStyle === 'luxury') {
      requests.push('Include high-end experiences and premium accommodations.');
    } else if (request.preferences.travelStyle === 'budget') {
      requests.push('Focus on budget-friendly options and free activities.');
    } else if (request.preferences.travelStyle === 'adventure') {
      requests.push('Include outdoor activities and adventurous experiences.');
    } else if (request.preferences.travelStyle === 'cultural') {
      requests.push(
        'Emphasize cultural immersion and historical significance.',
      );
    }

    if (request.preferences.interests.includes('food')) {
      requests.push('Include diverse culinary experiences and food tours.');
    }

    if (request.preferences.interests.includes('history')) {
      requests.push('Focus on historical sites and cultural heritage.');
    }

    if (request.preferences.interests.includes('nature')) {
      requests.push('Include natural attractions and outdoor activities.');
    }

    if (request.preferences.groupType === 'family') {
      requests.push(
        'Ensure activities are family-friendly and suitable for all ages.',
      );
    } else if (request.preferences.groupType === 'romantic') {
      requests.push('Include romantic experiences and intimate settings.');
    }

    return requests.length > 0
      ? `\n\nSpecial Requests:\n- ${requests.join('\n- ')}`
      : '';
  }

  /**
   * Get Vietnamese regional context
   */
  private getVietnameseRegionalContext(
    region: 'north' | 'central' | 'south',
  ): string {
    const contexts = {
      north: `Northern Vietnam (Hanoi region):
- Cooler climate, distinct seasons
- Rich in history and traditional culture
- Famous for pho, bun cha, and egg coffee
- French colonial architecture
- Nearby: Halong Bay, Sapa, Ninh Binh`,

      central: `Central Vietnam (Hue, Hoi An, Da Nang):
- Ancient imperial capital region
- UNESCO World Heritage sites
- Unique royal cuisine and local specialties
- Traditional crafts and lantern culture
- Beautiful beaches and mountain scenery`,

      south: `Southern Vietnam (Ho Chi Minh City region):
- Tropical climate year-round
- Economic hub with modern attractions
- Diverse cuisine with international influences
- Vibrant nightlife and markets
- Nearby: Mekong Delta, Cu Chi Tunnels`,
    };

    return contexts[region];
  }

  /**
   * Get Vietnamese seasonal context
   */
  private getVietnameseSeasonalContext(season: string): string {
    const contexts = {
      winter:
        'Cool and dry in the north, pleasant in central and south regions',
      spring:
        'Ideal weather across most regions, perfect for outdoor activities',
      summer: 'Hot and humid, rainy season in many areas',
      autumn: 'Comfortable temperatures, less rainfall',
    };

    return contexts[season] || 'Variable weather conditions';
  }

  /**
   * Get country cost level description
   */
  private getCountryCostLevel(country: string): string {
    const levels = {
      vietnam: 'Low cost - Excellent value for money',
      thailand: 'Low to moderate cost',
      singapore: 'High cost - Expensive but efficient',
      japan: 'High cost - Premium experiences',
      indonesia: 'Low cost - Very budget-friendly',
      philippines: 'Low cost - Great for budget travelers',
      malaysia: 'Moderate cost - Good value',
    };

    return levels[country.toLowerCase()] || 'Moderate cost level';
  }

  /**
   * Get daily budget ranges for country
   */
  private getDailyBudgetRanges(country: string, currency: string): string {
    // Vietnam budget ranges in VND
    if (country.toLowerCase() === 'vietnam' && currency === 'VND') {
      return `
- Budget: 300,000-500,000 VND/day
- Mid-range: 500,000-1,000,000 VND/day  
- Luxury: 1,000,000+ VND/day`;
    }

    // Generic ranges in USD
    return `
- Budget: $20-40/day
- Mid-range: $40-80/day
- Luxury: $80+/day`;
  }
}
