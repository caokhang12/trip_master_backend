import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

import { APIThrottleService } from '../../shared/services/api-throttle.service';
import { PromptBuilderService } from 'src/ai/services/prompt-builder.service';
import {
  AIGenerationRequest,
  GeneratedItinerary,
  PromptContext,
} from 'src/ai/interfaces/ai.interface';

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
 * Interface for activity data used in cost estimation
 */
export interface ActivityForCostEstimation {
  title: string;
  description?: string;
  location?: string;
  duration?: number;
  type?: string;
}

/**
 * Interface for location suggestions
 */
export interface LocationSuggestion {
  name: string;
  description: string;
  estimatedCost: number;
  duration: number;
  category: string;
  reasonForSuggestion: string;
}

/**
 * AI service for cost estimation and country-aware itinerary generation
 * Integrates OpenAI for intelligent travel planning with global destinations
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly openai: OpenAI;
  private readonly maxTokens: number;
  private readonly temperature: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly throttleService: APIThrottleService,
  ) {
    // Initialize OpenAI client if API key is available
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const endpoint = this.configService.get<string>(
      'OPENAI_API_ENDPOINT',
      'https://models.github.ai/inference',
    );
    if (apiKey) {
      this.openai = new OpenAI({ baseURL: endpoint, apiKey });
      this.maxTokens = parseInt(
        this.configService.get<string>('OPENAI_MAX_TOKENS', '4000'),
        10,
      );
      this.temperature = parseFloat(
        this.configService.get<string>('OPENAI_TEMPERATURE', '0.3'),
      );

      this.logger.debug(
        `AI Service initialized with max_tokens: ${this.maxTokens}, temperature: ${this.temperature}`,
      );
    } else {
      this.logger.warn(
        'OpenAI API key not provided, AI features will use fallback responses',
      );
    }
  }

  /**
   * Generate intelligent travel itinerary with country-specific optimization
   */
  async generateItinerary(
    request: AIGenerationRequest,
    userId: string,
  ): Promise<GeneratedItinerary> {
    if (!this.openai) {
      this.logger.warn('OpenAI not configured, using fallback itinerary');
      return this.getFallbackItinerary(request);
    }

    try {
      this.logger.log(
        `Generating itinerary for ${request.destination}, ${request.country}`,
      );
      this.logger.debug(
        `Using max_tokens: ${Math.min(this.maxTokens, 3000)}, temperature: ${Math.min(this.temperature, 0.5)}`,
      );

      // Check rate limits
      this.throttleService.checkRateLimit(userId, 'itinerary');

      // Build context and prompts
      const promptContext = this.buildPromptContext(request);
      const systemPrompt = this.promptBuilder.buildSystemPrompt(promptContext);
      const userPrompt = this.promptBuilder.buildUserPrompt(request);

      this.logger.debug(
        `System prompt length: ${systemPrompt.length}, User prompt length: ${userPrompt.length}`,
      );

      // Call OpenAI API with optimized settings for JSON responses
      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-3.5-turbo'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: Math.min(this.maxTokens, 3000), // Ensure enough tokens for complete response
        temperature: Math.min(this.temperature, 0.5), // Lower temperature for more consistent JSON
        response_format: { type: 'json_object' },
        top_p: 0.9, // Reduce randomness for better JSON structure
      });

      this.logger.debug(
        `OpenAI response tokens used: ${completion.usage?.total_tokens || 0}`,
      );

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('Empty response from OpenAI');
      }

      this.logger.debug(`Response content length: ${responseContent.length}`);

      // Parse and validate response
      const itinerary = this.parseItineraryResponse(responseContent);

      // Log usage for cost tracking
      this.throttleService.logUsage(userId, {
        userId,
        tokensUsed: completion.usage?.total_tokens || 0,
        requestType: 'itinerary',
        cost: this.throttleService.calculateOpenAICost(
          completion.usage?.total_tokens || 0,
        ),
        timestamp: new Date(),
        success: true,
      });

      this.logger.log(
        `Successfully generated itinerary for ${request.destination}`,
      );
      return itinerary;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to generate itinerary: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Log failed usage
      this.throttleService.logUsage(userId, {
        userId,
        tokensUsed: 0,
        requestType: 'itinerary',
        cost: 0,
        timestamp: new Date(),
        success: false,
      });

      return this.getFallbackItinerary(request);
    }
  }

  /**
   * Generate location-specific activity suggestions
   */
  async generateLocationSuggestions(
    location: string,
    travelStyle: string,
    budget: number,
    interests?: string[],
  ): Promise<LocationSuggestion[]> {
    if (!this.openai) {
      return this.getFallbackSuggestions(location, travelStyle);
    }

    try {
      this.logger.log(`Generating suggestions for ${location}`);

      const prompt = this.buildSuggestionsPrompt({
        location,
        travelStyle,
        budget,
        interests,
      });

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-3.5-turbo'),
        messages: [{ role: 'user', content: prompt }],
        max_tokens: Math.min(this.maxTokens, 800),
        temperature: this.temperature,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(responseContent) as {
        suggestions?: LocationSuggestion[];
      };
      return parsed.suggestions || [];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to generate suggestions: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      return this.getFallbackSuggestions(location, travelStyle);
    }
  }

  estimateActivityCost(
    activity: ActivityForCostEstimation,
    country: string,
    currency: string,
  ): {
    estimatedCost: number;
    category: string;
    breakdown?: Record<string, number>;
  } {
    const request: CostEstimationRequest = {
      activity: activity.title,
      description: activity.description,
      location: activity.location || country,
      country: this.getCountryCode(country),
      duration: activity.duration,
      type: this.mapActivityType(activity.type),
    };

    const estimation = this.estimateActivityCostInternal(request);

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
  private estimateActivityCostInternal(
    request: CostEstimationRequest,
  ): CostEstimationResponse {
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
      VN: 0.3, // Vietnam
      TH: 0.4, // Thailand
      ID: 0.35, // Indonesia
      PH: 0.4, // Philippines
      MY: 0.5, // Malaysia
      SG: 1.5, // Singapore
      JP: 1.8, // Japan
      KR: 1.2, // South Korea
      CN: 0.6, // China
      IN: 0.25, // India
      US: 1.0, // Baseline
      CA: 1.1, // Canada
      AU: 1.3, // Australia
      GB: 1.3, // UK
      FR: 1.2, // France
      DE: 1.1, // Germany
      IT: 1.0, // Italy
      ES: 0.9, // Spain
      CH: 2.0, // Switzerland
      NL: 1.2, // Netherlands
      SE: 1.4, // Sweden
      NO: 1.6, // Norway
      DK: 1.3, // Denmark
    };

    // Activity-specific adjustments
    const activityAdjustments = this.getActivityAdjustments(request);

    const baseCost =
      (baseCosts as Record<string, number>)[request.type] ??
      baseCosts.miscellaneous;
    const countryMultiplier =
      (countryMultipliers as Record<string, number>)[request.country] ?? 0.7;
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
      Indonesia: 'ID',
      Philippines: 'PH',
      Malaysia: 'MY',
      Singapore: 'SG',
      Japan: 'JP',
      'South Korea': 'KR',
      China: 'CN',
      India: 'IN',
      'United States': 'US',
      Canada: 'CA',
      Australia: 'AU',
      'United Kingdom': 'GB',
      France: 'FR',
      Germany: 'DE',
      Italy: 'IT',
      Spain: 'ES',
      Switzerland: 'CH',
      Netherlands: 'NL',
      Sweden: 'SE',
      Norway: 'NO',
      Denmark: 'DK',
    };

    return countryMap[country] || 'US';
  }

  /**
   * Build prompt context for AI generation
   */
  private buildPromptContext(request: AIGenerationRequest): PromptContext {
    const context: PromptContext = {
      country: request.country,
      season: this.getCurrentSeason(request.startDate),
    };

    // Add budget guidelines
    context.budgetGuidelines = this.buildBudgetGuidelines(
      request.budget,
      request.currency,
      request.country,
    );

    return context;
  }

  /**
   * Build system prompt for OpenAI
   */
  private buildSystemPrompt(context: PromptContext): string {
    return `You are an expert travel planner specializing in ${context.country}.

${context.budgetGuidelines || ''}

Generate a detailed travel itinerary in valid JSON format with the following structure:
{
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "name": "Activity name",
          "description": "Detailed description",
          "location": "Specific location",
          "duration": 120,
          "estimatedCost": 50,
          "category": "sightseeing",
          "timeSlot": "morning",
          "localTips": ["tip1", "tip2"]
        }
      ],
      "dailyBudget": 200,
      "transportationNotes": "How to get around"
    }
  ],
  "summary": {
    "totalDays": 5,
    "highlights": ["highlight1", "highlight2"],
    "budgetBreakdown": {
      "accommodation": 1000,
      "food": 500,
      "activities": 300,
      "transportation": 200,
      "shopping": 100,
      "miscellaneous": 50,
      "total": 2150
    }
  },
  "totalEstimatedCost": 2150,
  "currency": "USD"
}

Focus on authentic local experiences and cultural immersion. Always include practical tips.`;
  }

  /**
   * Build user prompt for specific request
   */
  private buildUserPrompt(request: AIGenerationRequest): string {
    const days = Math.ceil(
      (new Date(request.endDate).getTime() -
        new Date(request.startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return `Create a ${days}-day itinerary for ${request.travelers} travelers visiting ${request.destination}, ${request.country} from ${request.startDate} to ${request.endDate}.

Travel Style: ${request.preferences.travelStyle}
Budget: ${request.budget} ${request.currency}
Interests: ${request.preferences.interests.join(', ')}
${request.preferences.dietaryRestrictions ? `Dietary Restrictions: ${request.preferences.dietaryRestrictions.join(', ')}` : ''}
${request.preferences.transportPreference ? `Transport Preference: ${request.preferences.transportPreference}` : ''}
${request.accommodationLocation ? `Accommodation: ${request.accommodationLocation}` : ''}

Generate a comprehensive itinerary with cultural context and local insights.`;
  }

  /**
   * Build suggestions prompt
   */
  private buildSuggestionsPrompt(params: {
    location: string;
    travelStyle: string;
    budget: number;
    interests?: string[];
  }): string {
    return `Suggest 5-8 activities for ${params.location} matching:
- Travel style: ${params.travelStyle}
- Budget: ${params.budget}
- Interests: ${params.interests?.join(', ') || 'general'}

Return JSON format:
{
  "suggestions": [
    {
      "name": "Activity name",
      "description": "Description",
      "estimatedCost": 50000,
      "duration": 120,
      "category": "cultural",
      "reasonForSuggestion": "Why this fits"
    }
  ]
}`;
  }

  /**
   * Parse AI response into structured itinerary
   */
  private parseItineraryResponse(response: string): GeneratedItinerary {
    try {
      // Log raw response for debugging (truncated)
      this.logger.debug(
        `AI raw response (first 500 chars): ${response.substring(0, 500)}...`,
      );

      // Clean up the response first
      const cleanedResponse = this.cleanJsonResponse(response);

      const parsed = JSON.parse(cleanedResponse) as unknown;

      // Validate required fields with type guards
      if (!this.isValidItineraryResponse(parsed)) {
        throw new Error('Invalid itinerary format: missing required fields');
      }

      return parsed;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to parse AI response: ${errorMessage}`);
      this.logger.debug(`Problematic response: ${response}`);

      // Try to salvage partial JSON
      const salvaged = this.salvagePartialJson(response);
      if (salvaged) {
        this.logger.warn('Using salvaged partial JSON response');
        return salvaged;
      }

      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Type guard to validate itinerary response structure
   */
  private isValidItineraryResponse(obj: unknown): obj is GeneratedItinerary {
    if (!obj || typeof obj !== 'object') return false;

    const parsed = obj as Record<string, unknown>;

    // Check for required fields
    if (!parsed.days || !Array.isArray(parsed.days)) return false;
    if (!parsed.summary || typeof parsed.summary !== 'object') return false;

    return true;
  }

  /**
   * Clean up JSON response from AI
   */
  private cleanJsonResponse(response: string): string {
    // Remove any markdown code blocks
    let cleaned = response.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '');

    // Remove any text before the first {
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace > 0) {
      cleaned = cleaned.substring(firstBrace);
    }

    // Remove any text after the last }
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > 0 && lastBrace < cleaned.length - 1) {
      cleaned = cleaned.substring(0, lastBrace + 1);
    }

    return cleaned.trim();
  }

  /**
   * Try to salvage partial JSON response
   */
  private salvagePartialJson(response: string): GeneratedItinerary | null {
    try {
      // Clean the response first
      const cleaned = this.cleanJsonResponse(response);

      // Try to complete the partial JSON
      const completed = this.completePartialJson(cleaned);
      if (completed) {
        const parsed = JSON.parse(completed) as unknown;

        // Validate and enhance the parsed object
        if (this.isValidItineraryResponse(parsed)) {
          const itinerary = parsed;

          // Ensure each day has required properties
          itinerary.days = itinerary.days.map((day, index) => ({
            dayNumber:
              typeof day.dayNumber === 'number' ? day.dayNumber : index + 1,
            date:
              typeof day.date === 'string'
                ? day.date
                : new Date().toISOString().split('T')[0],
            activities: Array.isArray(day.activities) ? day.activities : [],
            dailyBudget:
              typeof day.dailyBudget === 'number' ? day.dailyBudget : 200,
            transportationNotes:
              typeof day.transportationNotes === 'string'
                ? day.transportationNotes
                : 'Local transport available',
          }));

          // Create complete summary if missing or incomplete
          if (!itinerary.summary || typeof itinerary.summary !== 'object') {
            itinerary.summary = {
              totalDays: itinerary.days.length,
              highlights: [
                'Cultural exploration',
                'Local cuisine',
                'Historical sites',
              ],
              budgetBreakdown: {
                total: itinerary.days.length * 200,
                accommodation: itinerary.days.length * 80,
                food: itinerary.days.length * 60,
                activities: itinerary.days.length * 40,
                transportation: itinerary.days.length * 20,
                shopping: 0,
                miscellaneous: 0,
              },
            };
          }

          // Add total cost if missing
          if (typeof itinerary.totalEstimatedCost !== 'number') {
            itinerary.totalEstimatedCost =
              itinerary.summary.budgetBreakdown?.total ?? 0;
          }

          // Add currency if missing
          if (typeof itinerary.currency !== 'string') {
            itinerary.currency = 'USD';
          }

          return itinerary;
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.debug(`Failed to salvage JSON: ${errorMessage}`);
    }

    return null;
  }

  /**
   * Try to complete a partial JSON string
   */
  private completePartialJson(jsonStr: string): string | null {
    try {
      // First try to find a complete object
      const complete = this.findLastCompleteObject(jsonStr);
      if (complete) {
        // Try parsing the complete object
        JSON.parse(complete);
        return complete;
      }

      // If no complete object, try to repair the JSON
      let repaired = jsonStr.trim();

      // Count open/close braces and brackets
      const openBraces = (repaired.match(/{/g) || []).length;
      const closeBraces = (repaired.match(/}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/]/g) || []).length;

      // Add missing closing braces
      for (let i = 0; i < openBraces - closeBraces; i++) {
        repaired += '}';
      }

      // Add missing closing brackets
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        repaired += ']';
      }

      // Remove trailing commas that might break JSON
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

      // Try to parse the repaired JSON
      JSON.parse(repaired);
      return repaired;
    } catch (error) {
      this.logger.debug(
        `Could not repair JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Find the last complete JSON object in a string
   */
  private findLastCompleteObject(jsonStr: string): string | null {
    let braceCount = 0;
    let lastValidPosition = -1;

    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastValidPosition = i;
        }
      }
    }

    if (lastValidPosition > 0) {
      return jsonStr.substring(0, lastValidPosition + 1);
    }

    return null;
  }

  /**
   * Get fallback itinerary when AI fails
   */
  private getFallbackItinerary(
    request: AIGenerationRequest,
  ): GeneratedItinerary {
    this.logger.warn(`Providing fallback itinerary for ${request.destination}`);

    const days = Math.ceil(
      (new Date(request.endDate).getTime() -
        new Date(request.startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return {
      days: Array.from({ length: days }, (_, index) => ({
        dayNumber: index + 1,
        date: new Date(
          new Date(request.startDate).getTime() + index * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .split('T')[0],
        activities: [
          {
            name: 'Explore Local Area',
            description: 'Discover the neighborhood and local attractions',
            location: request.destination,
            duration: 240,
            estimatedCost: request.budget / days / 3,
            category: 'sightseeing',
            timeSlot: 'morning',
          },
          {
            name: 'Local Dining Experience',
            description: 'Try authentic local cuisine',
            location: request.destination,
            duration: 90,
            estimatedCost: request.budget / days / 4,
            category: 'food',
            timeSlot: 'afternoon',
          },
        ],
        dailyBudget: request.budget / days,
      })),
      summary: {
        totalDays: days,
        highlights: [
          'Local exploration',
          'Cultural dining',
          'Authentic experiences',
        ],
        budgetBreakdown: {
          accommodation: request.budget * 0.4,
          food: request.budget * 0.3,
          activities: request.budget * 0.2,
          transportation: request.budget * 0.1,
          shopping: 0,
          miscellaneous: 0,
          total: request.budget,
        },
      },
      totalEstimatedCost: request.budget,
      currency: request.currency,
    };
  }

  /**
   * Get fallback suggestions when AI fails
   */
  private getFallbackSuggestions(
    location: string,
    travelStyle: string,
  ): LocationSuggestion[] {
    return [
      {
        name: 'Local Market Visit',
        description: 'Explore traditional markets and local culture',
        estimatedCost: 50,
        duration: 120,
        category: 'cultural',
        reasonForSuggestion: `Matches ${travelStyle} travel style`,
      },
      {
        name: 'Historic Site Tour',
        description: 'Visit important historical landmarks',
        estimatedCost: 80,
        duration: 180,
        category: 'historical',
        reasonForSuggestion: 'Cultural and educational experience',
      },
    ];
  }

  /**
   * Generate cost estimation with country-specific pricing
   */
  async generateCostEstimation(
    destination: string,
    activityType: string,
    duration: number,
    travelers: number = 1,
    travelStyle: string = 'mid-range',
  ): Promise<{
    minCost: number;
    maxCost: number;
    averageCost: number;
    currency: string;
    breakdown: Record<string, number>;
    notes?: string[];
  }> {
    if (!this.openai) {
      this.logger.warn('OpenAI not configured, using fallback cost estimation');
      return this.getFallbackCostEstimation(
        destination,
        activityType,
        duration,
        travelers,
      );
    }

    try {
      this.logger.log(`Generating cost estimation for ${destination}`);

      const prompt = this.buildCostEstimationPrompt({
        destination,
        activityType,
        duration,
        travelers,
        travelStyle,
      });

      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-3.5-turbo'),
        messages: [{ role: 'user', content: prompt }],
        max_tokens: Math.min(this.maxTokens, 600),
        temperature: 0.3, // Lower temperature for more consistent cost estimates
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(responseContent) as {
        minCost: number;
        maxCost: number;
        averageCost: number;
        currency: string;
        breakdown: Record<string, number>;
        notes?: string[];
      };

      return parsed;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to generate cost estimation: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      return this.getFallbackCostEstimation(
        destination,
        activityType,
        duration,
        travelers,
      );
    }
  }

  /**
   * Build cost estimation prompt
   */
  private buildCostEstimationPrompt(params: {
    destination: string;
    activityType: string;
    duration: number;
    travelers: number;
    travelStyle: string;
  }): string {
    return `Estimate costs for ${params.duration} days of ${params.activityType} activities in ${params.destination} for ${params.travelers} travelers with ${params.travelStyle} travel style.

Return JSON format:
{
  "minCost": 100000,
  "maxCost": 300000,
  "averageCost": 200000,
  "currency": "VND",
  "breakdown": {
    "accommodation": 120000,
    "food": 50000,
    "activities": 40000,
    "transportation": 30000,
    "shopping": 20000,
    "miscellaneous": 10000,
    "total": 270000
  },
  "notes": ["Price varies by season", "Budget options available"]
}

Consider local pricing, seasonal variations, and travel style preferences.`;
  }

  /**
   * Get fallback cost estimation when AI fails
   */
  private getFallbackCostEstimation(
    destination: string,
    activityType: string,
    duration: number,
    travelers: number,
  ): {
    minCost: number;
    maxCost: number;
    averageCost: number;
    currency: string;
    breakdown: any;
    notes: string[];
  } {
    // Simple fallback estimation based on known patterns
    const baseCosts = {
      sightseeing: 50,
      food: 80,
      transport: 30,
      accommodation: 150,
      shopping: 100,
      miscellaneous: 25,
    };

    const baseCost =
      baseCosts[activityType as keyof typeof baseCosts] ||
      baseCosts.miscellaneous;
    const estimatedAmount = baseCost * duration;
    const totalCost = estimatedAmount * travelers;

    return {
      minCost: Math.round(totalCost * 0.7),
      maxCost: Math.round(totalCost * 1.5),
      averageCost: Math.round(totalCost),
      currency: 'USD',
      breakdown: {
        activityFee: Math.round(estimatedAmount * 0.5 * travelers),
        transportation: Math.round(estimatedAmount * 0.3 * travelers),
        food: Math.round(estimatedAmount * 0.15 * travelers),
        miscellaneous: Math.round(estimatedAmount * 0.05 * travelers),
        total: Math.round(totalCost),
      },
      notes: [
        'Estimated based on historical data',
        'Actual costs may vary significantly',
        'Consider local economic conditions',
      ],
    };
  }

  /**
   * Get country-specific cost multiplier for AI context
   */
  private getCountryMultiplierForAI(country: string): number {
    const multipliers: Record<string, number> = {
      vietnam: 0.3,
      thailand: 0.4,
      indonesia: 0.35,
      philippines: 0.4,
      malaysia: 0.5,
      singapore: 1.5,
      japan: 1.8,
      'south korea': 1.2,
      china: 0.6,
      india: 0.25,
      'united states': 1.0,
      canada: 1.1,
      australia: 1.3,
      'united kingdom': 1.3,
      france: 1.2,
      germany: 1.1,
      italy: 1.0,
      spain: 0.9,
      switzerland: 2.0,
      netherlands: 1.2,
      sweden: 1.4,
      norway: 1.6,
      denmark: 1.3,
    };

    return multipliers[country.toLowerCase()] || 1.0;
  }

  /**
   * Get current season based on date
   */
  private getCurrentSeason(startDate: string): string {
    const month = new Date(startDate).getMonth() + 1;

    if (month >= 12 || month <= 2) return 'winter';
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    return 'autumn';
  }

  /**
   * Build budget guidelines string
   */
  private buildBudgetGuidelines(
    budget: number,
    currency: string,
    country: string,
  ): string {
    const countryMultiplier = this.getCountryMultiplierForAI(country);
    const adjustedBudget = budget * countryMultiplier;

    return `Budget guidelines: ${adjustedBudget} ${currency} total, 
          Country cost level: ${countryMultiplier === 1 ? 'standard' : countryMultiplier < 1 ? 'low-cost' : 'high-cost'}`;
  }
}
