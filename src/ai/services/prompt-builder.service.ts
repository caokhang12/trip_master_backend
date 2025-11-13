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

    // Preferences sections must be placed at the very top per requirements
    const userPrefsSection = context.userPreferencesSection
      ? `\n\n(1) USER LONG-TERM PREFERENCES\n${context.userPreferencesSection}`
      : '';
    const tripPrefsSection = context.tripPreferencesSection
      ? `\n\n(2) TRIP-SPECIFIC PREFERENCES\n${context.tripPreferencesSection}`
      : '';

    // Rules section (3)
    const rulesSection = `\n\n(3) MANDATORY RULES\n- Trip-specific preferences override when present; otherwise fallback to user preferences.\n- Never modify or infer user long-term preferences.\n- Always respect dietary restrictions and accessibility needs.\n- Strictly follow output JSON schema; respond with JSON ONLY.`;

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

CRITICAL: You MUST respond with valid JSON only. No markdown, explanations, or additional text.

Generate a travel itinerary using this EXACT JSON schema with STRICT validation:

{
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "name": "Activity name (max 50 chars)",
          "description": "Brief description (max 80 chars)",
          "location": "Specific address or landmark",
          "duration": 120,
          "estimatedCost": 50000,
          "category": "sightseeing|food|transport|accommodation|shopping|entertainment",
          "timeSlot": "morning|afternoon|evening|full-day",
          "localTips": ["practical tip 1", "insider tip 2"],
          "bookingRequired": true|false,
          "accessibility": "wheelchair-friendly|moderate-walking|strenuous",
          "weatherDependent": true|false
        }
      ],
      "dailyBudget": 200000,
      "transportationNotes": "Transport between activities (max 60 chars)",
      "mealSuggestions": ["breakfast location", "lunch location", "dinner location"]
    }
  ],
  "summary": {
    "totalDays": 5,
    "highlights": ["unique experience 1", "must-see attraction 2", "local specialty 3"],
    "budgetBreakdown": {
      "accommodation": 1000000,
      "food": 500000,
      "activities": 300000,
      "transportation": 200000,
      "shopping": 100000,
      "miscellaneous": 100000,
      "total": 2200000
    },
    "bestTimeToVisit": "Optimal season and timing advice",
    "packingRecommendations": ["essential item 1", "weather-specific item 2", "cultural item 3"],
    "budgetTips": ["money-saving tip 1", "value tip 2"],
    "difficultyLevel": "easy|moderate|challenging"
  },
  "culturalContext": {
    "country": "${context.country}",
    "currency": "Local currency code and symbol",
    "language": "Primary language and useful phrases",
    "tipping": "Tipping culture and percentages",
    "customs": ["cultural norm 1", "etiquette rule 2"],
    "safetyTips": ["safety advice 1", "emergency info 2"],
    "localLaws": ["important regulation 1", "tourist rule 2"]
  },
  "totalEstimatedCost": 2200000,
  "currency": "LOCAL_CURRENCY_CODE"
}

STRICT FORMATTING RULES:
- JSON must be valid and parseable
- All strings must use double quotes
- Numbers must be integers (no decimals for costs)
- All arrays must be properly closed
- All required fields must be present
- Description limits are HARD LIMITS - truncate if needed
- Currency amounts in local currency as integers
- Dates in ISO format (YYYY-MM-DD)

CONTENT QUALITY REQUIREMENTS:
- Maximum 4 activities per day to avoid overloading
- Mix tourist attractions (30%) with local experiences (70%)
- Include realistic travel time between locations
- Costs must reflect actual local pricing
- Tips must be actionable and specific
- All locations must be real and verifiable`;

    return (
      // Preferences at the top, then base, then rules, then schema
      userPrefsSection +
      tripPrefsSection +
      basePrompt +
      culturalSection +
      expertiseSection +
      budgetSection +
      seasonalSection +
      rulesSection +
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

    // Calculate daily budget for better cost constraints
    const dailyBudget = Math.floor(request.budget / days);
    const season = this.determineSeason(request.startDate);

    const baseRequest = `Create a ${days}-day itinerary for ${request.travelers} travelers visiting ${request.destination}, ${request.country} from ${request.startDate} to ${request.endDate}.

TRIP PARAMETERS:
- Total Budget: ${request.budget} ${request.currency} (${dailyBudget} per day)
- Season: ${season}
- Travelers: ${request.travelers} ${request.travelers === 1 ? 'person' : 'people'}`;

    const preferences = `
TRAVELER PROFILE:
- Travel Style: ${request.preferences.travelStyle}
- Group Type: ${request.preferences.groupType || 'not specified'}
- Activity Level: ${request.preferences.activityLevel || 'moderate'}
- Primary Interests: ${request.preferences.interests.join(', ')}`;

    const constraints = this.buildConstraints(request);
    const specialRequests = this.buildSpecialRequests(request);

    return (
      baseRequest +
      preferences +
      constraints +
      specialRequests +
      '\n\nPRIORITIES:\n- Authentic local experiences over tourist traps\n- Realistic travel times between locations\n- Accurate local pricing\n- Cultural sensitivity and respect\n- Practical, actionable advice'
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
    const budgetLevel = this.categorizeBudget(params.budget);

    return `Generate 6-8 authentic, locally-recommended activities for ${params.location}.

REQUIREMENTS:
- Travel Style: ${params.travelStyle}
- Budget Category: ${budgetLevel}
- Budget Amount: ${params.budget} (local currency)
- Interests: ${params.interests?.join(', ') || 'general exploration'}

FOCUS PRIORITIES:
1. Authentic local experiences (70%) over tourist attractions (30%)
2. Hidden gems known by locals but accessible to travelers
3. Cultural immersion and interaction opportunities
4. Mix of free/low-cost (40%) and paid experiences (60%)
5. Seasonal appropriateness and weather considerations
6. Realistic duration and logistics

AVOID:
- Generic tourist traps
- Overpriced experiences for tourists
- Activities requiring extensive local knowledge
- Experiences inappropriate for the travel style

Return ONLY valid JSON in this exact format:
{
  "suggestions": [
    {
      "name": "Activity name (max 40 chars)",
      "description": "Engaging description with cultural context (max 120 chars)",
      "estimatedCost": 50000,
      "duration": 120,
      "category": "cultural|food|nature|adventure|relaxation|shopping|nightlife",
      "reasonForSuggestion": "Specific match to traveler preferences (max 80 chars)",
      "localTips": ["practical tip", "insider advice"],
      "bestTimeToVisit": "Optimal timing recommendation",
      "difficultyLevel": "easy|moderate|challenging",
      "crowdLevel": "quiet|moderate|busy",
      "bookingRequired": true|false
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
   * Get country cost level description
   */
  private getCountryCostLevel(country: string): string {
    const levels: Record<string, string> = {
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

  /**
   * Determine season from date
   */
  private determineSeason(dateString: string): string {
    const date = new Date(dateString);
    const month = date.getMonth() + 1; // getMonth() returns 0-11

    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  /**
   * Build constraints section
   */
  private buildConstraints(request: AIGenerationRequest): string {
    const constraints: string[] = [];

    if (request.preferences.dietaryRestrictions?.length) {
      constraints.push(
        `Dietary Restrictions: ${request.preferences.dietaryRestrictions.join(', ')}`,
      );
    }

    if (request.preferences.accessibilityNeeds?.length) {
      constraints.push(
        `Accessibility Needs: ${request.preferences.accessibilityNeeds.join(', ')}`,
      );
    }

    if (request.preferences.transportPreference) {
      constraints.push(
        `Transport Preference: ${request.preferences.transportPreference}`,
      );
    }

    if (request.accommodationLocation) {
      constraints.push(`Accommodation Area: ${request.accommodationLocation}`);
    }

    return constraints.length > 0
      ? `\n\nCONSTRAINTS:\n- ${constraints.join('\n- ')}`
      : '';
  }

  /**
   * Categorize budget level for better prompt context
   */
  private categorizeBudget(budget: number): string {
    // This is a simplified categorization - in real world, you'd want location-specific thresholds
    if (budget <= 50) return 'Budget/Backpacker';
    if (budget <= 150) return 'Mid-range';
    if (budget <= 300) return 'Comfort';
    return 'Luxury';
  }
}
