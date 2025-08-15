import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import {
  AIGenerationRequest,
  GeneratedItinerary,
  PromptContext,
} from '../interfaces/ai.interface';
import { PromptBuilderService } from './prompt-builder.service';
import { APIThrottleService } from '../../shared/services/api-throttle.service';
import { ActivityCategory } from 'src/trip/enum/trip-enum';

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
 * Interface for activity suggestions response
 */
interface SuggestionsResponse {
  suggestions: ActivitySuggestion[];
}

/**
 * Interface for activity suggestion
 */
interface ActivitySuggestion {
  name: string;
  description: string;
  estimatedCost: number;
  duration: number;
  category: string;
  reasonForSuggestion: string;
}

/**
 * Interface for activity input to cost estimation
 */
interface ActivityInput {
  title?: string;
  description?: string;
  location?: string;
  duration?: number;
  type?: string;
}

/**
 * AI service for cost estimation and country-aware itinerary generation
 * Integrates OpenAI for intelligent travel planning
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
      this.openai = new OpenAI({
        baseURL: endpoint,
        apiKey,
        // Optimize retry strategy with exponential backoff
        maxRetries: 3, // Default is 2, increase for better reliability
        timeout: 60000, // 60 seconds timeout for better reliability
      });
      this.maxTokens = parseInt(
        this.configService.get<string>('OPENAI_MAX_TOKENS', '4000'),
        10,
      );
      this.temperature = parseFloat(
        this.configService.get<string>('OPENAI_TEMPERATURE', '0.3'),
      );

      this.logger.debug(
        `AI Service initialized with max_tokens: ${this.maxTokens} (type: ${typeof this.maxTokens}), temperature: ${this.temperature} (type: ${typeof this.temperature})`,
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
      const selectedModel = this.selectOptimalModel(request);
      this.logger.debug(
        `Selected model: ${selectedModel} for request complexity`,
      );

      const { data: completion, response: rawResponse } =
        await this.openai.chat.completions
          .create({
            model: selectedModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            max_tokens: Math.min(this.maxTokens, 3000), // Ensure enough tokens for complete response
            temperature: Math.min(this.temperature, 0.5), // Lower temperature for more consistent JSON
            response_format: { type: 'json_object' },
            top_p: 0.9, // Reduce randomness for better JSON structure
          })
          .withResponse(); // Get both data and response for debugging

      this.logger.debug(
        `OpenAI response tokens used: ${completion.usage?.total_tokens || 0}`,
      );

      // Log request ID for debugging support
      const requestId = rawResponse.headers.get('x-request-id');
      if (requestId) {
        this.logger.debug(`OpenAI Request ID: ${requestId}`);
      }

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
      // Enhanced error handling with specific OpenAI error types
      if (error instanceof OpenAI.APIError) {
        this.logger.error(
          `OpenAI API Error: ${error.name} (${error.status}) - ${error.message}`,
          {
            requestID: error.status ? 'available' : 'unknown',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            status: error.status || 'unknown',
            hasHeaders: Boolean(error.headers),
          },
        );

        // Handle specific error types differently
        if (error instanceof OpenAI.RateLimitError) {
          this.logger.warn('Rate limit exceeded, using fallback');
        } else if (error instanceof OpenAI.AuthenticationError) {
          this.logger.error('Authentication failed - check API key');
        } else if (error instanceof OpenAI.InternalServerError) {
          this.logger.error('OpenAI server error - will retry automatically');
        }
      } else {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to generate itinerary: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
        );
      }

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
   * Generate intelligent travel itinerary with streaming support for real-time updates
   */
  async *generateItineraryStream(
    request: AIGenerationRequest,
    userId: string,
  ): AsyncIterable<{
    delta: string;
    completed: boolean;
    data?: GeneratedItinerary;
  }> {
    if (!this.openai) {
      this.logger.warn('OpenAI not configured, using fallback itinerary');
      yield { delta: 'Using fallback response...', completed: false };
      yield {
        delta: '',
        completed: true,
        data: this.getFallbackItinerary(request),
      };
      return;
    }

    try {
      this.logger.log(
        `Generating streaming itinerary for ${request.destination}, ${request.country}`,
      );

      // Check rate limits
      this.throttleService.checkRateLimit(userId, 'itinerary');

      // Build context and prompts
      const promptContext = this.buildPromptContext(request);
      const systemPrompt = this.promptBuilder.buildSystemPrompt(promptContext);
      const userPrompt = this.promptBuilder.buildUserPrompt(request);

      // Call OpenAI API with streaming enabled
      const stream = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-3.5-turbo'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: Math.min(this.maxTokens, 3000),
        temperature: Math.min(this.temperature, 0.5),
        response_format: { type: 'json_object' },
        stream: true, // Enable streaming
      });

      let fullContent = '';
      let totalTokens = 0;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullContent += delta;
          yield { delta, completed: false };
        }

        // Track usage from stream chunks if available
        if (chunk.usage) {
          totalTokens = chunk.usage.total_tokens;
        }
      }

      // Parse final result
      const itinerary = this.parseItineraryResponse(fullContent);

      // Log usage for cost tracking
      this.throttleService.logUsage(userId, {
        userId,
        tokensUsed: totalTokens,
        requestType: 'itinerary',
        cost: this.throttleService.calculateOpenAICost(totalTokens),
        timestamp: new Date(),
        success: true,
      });

      yield { delta: '', completed: true, data: itinerary };
    } catch (error) {
      // Enhanced error handling
      if (error instanceof OpenAI.APIError) {
        this.logger.error(
          `OpenAI Streaming API Error: ${error.name} (${error.status}) - ${error.message}`,
        );
      }

      // Log failed usage
      this.throttleService.logUsage(userId, {
        userId,
        tokensUsed: 0,
        requestType: 'itinerary',
        cost: 0,
        timestamp: new Date(),
        success: false,
      });

      yield { delta: 'Error occurred, using fallback...', completed: false };
      yield {
        delta: '',
        completed: true,
        data: this.getFallbackItinerary(request),
      };
    }
  }

  /**
   * Select optimal model based on request complexity and requirements
   */
  private selectOptimalModel(request: AIGenerationRequest): string {
    const defaultModel = this.configService.get<string>(
      'OPENAI_MODEL',
      'gpt-3.5-turbo',
    );

    // Simple heuristics for model selection
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const hasComplexRequirements =
      request.preferences.interests.length > 3 ||
      request.preferences.interests.some(
        (interest) =>
          interest.toLowerCase().includes('luxury') ||
          interest.toLowerCase().includes('adventure'),
      ) ||
      ['luxury', 'adventure'].includes(request.preferences.travelStyle) ||
      request.budget > 5000; // High budget trips might need more sophisticated planning

    // For complex or long trips, use more capable models
    if (totalDays > 7 || hasComplexRequirements) {
      // Check if GPT-4 is available, otherwise fallback
      const gpt4Model = this.configService.get<string>(
        'OPENAI_GPT4_MODEL',
        'gpt-4o',
      );
      return gpt4Model;
    }

    // For simple trips, optimize for cost with faster models
    if (totalDays <= 3 && !hasComplexRequirements) {
      return 'gpt-3.5-turbo';
    }

    return defaultModel;
  }

  /**
   * Generate location-specific activity suggestions
   */
  async generateLocationSuggestions(
    location: string,
    travelStyle: string,
    budget: number,
    interests?: string[],
  ): Promise<ActivitySuggestion[]> {
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

      const suggestions: SuggestionsResponse = JSON.parse(
        responseContent,
      ) as SuggestionsResponse;
      return suggestions.suggestions || [];
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
    activity: ActivityInput,
    country: string,
  ): {
    estimatedCost: number;
    category: string;
    breakdown?: Record<string, number>;
  } {
    const request: CostEstimationRequest = {
      activity: activity.title || 'Unknown activity',
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
    const baseCosts: Record<string, number> = {
      transport: 15,
      food: 25,
      accommodation: 80,
      activity: 20,
      shopping: 30,
      miscellaneous: 10,
    };

    // Country-specific multipliers
    const countryMultipliers: Record<string, number> = {
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

    const baseCost = baseCosts[request.type] ?? baseCosts.miscellaneous;
    const countryMultiplier = countryMultipliers[request.country] ?? 0.7;
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

${context.culturalContext || ''}
${context.localExpertise || ''}
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
          "estimatedCost": 50000,
          "category": "sightseeing",
          "timeSlot": "morning",
          "localTips": ["tip1", "tip2"]
        }
      ],
      "dailyBudget": 200000,
      "transportationNotes": "How to get around"
    }
  ],
  "summary": {
    "totalDays": 5,
    "highlights": ["highlight1", "highlight2"],
    "budgetBreakdown": {
      "accommodation": 1000000,
      "food": 500000,
      "activities": 300000,
      "transportation": 200000,
      "shopping": 100000,
      "miscellaneous": 50000,
      "total": 2150000
    }
  },
  "totalEstimatedCost": 2150000,
  "currency": "VND"
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

      const parsed: unknown = JSON.parse(cleanedResponse);

      // Validate required fields
      if (!this.isValidItinerary(parsed)) {
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
   * Type guard to validate if parsed object is a valid itinerary
   */
  private isValidItinerary(obj: unknown): obj is GeneratedItinerary {
    if (!obj || typeof obj !== 'object') return false;

    const candidate = obj as Record<string, unknown>;

    return (
      Array.isArray(candidate.days) &&
      candidate.summary !== undefined &&
      typeof candidate.totalEstimatedCost === 'number' &&
      typeof candidate.currency === 'string'
    );
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
        const parsed: unknown = JSON.parse(completed);

        // Validate and enhance the parsed object
        if (this.isValidPartialItinerary(parsed)) {
          const itinerary = parsed as Partial<GeneratedItinerary>;

          // Ensure each day has required properties
          if (itinerary.days) {
            itinerary.days = itinerary.days.map((day, index) => ({
              dayNumber: day?.dayNumber ?? index + 1,
              date: day?.date ?? new Date().toISOString().split('T')[0],
              activities: day?.activities ?? [],
              dailyBudget: day?.dailyBudget ?? 200000,
              transportationNotes:
                day?.transportationNotes ?? 'Local transport available',
            }));
          }

          // Create complete summary if missing or incomplete
          if (!itinerary.summary?.budgetBreakdown) {
            const totalDays = itinerary.days?.length ?? 1;
            itinerary.summary = {
              totalDays,
              highlights: itinerary.summary?.highlights ?? [
                'Cultural exploration',
                'Local cuisine',
                'Historical sites',
              ],
              budgetBreakdown: {
                total: totalDays * 200000,
                accommodation: totalDays * 80000,
                food: totalDays * 60000,
                activities: totalDays * 40000,
                transportation: totalDays * 20000,
                shopping: totalDays * 10000,
                miscellaneous: totalDays * 10000,
              },
              bestTimeToVisit:
                itinerary.summary?.bestTimeToVisit ?? 'Year-round destination',
              packingRecommendations: itinerary.summary
                ?.packingRecommendations ?? [
                'Comfortable walking shoes',
                'Weather-appropriate clothing',
                'Camera',
              ],
            };
          }

          // Add total cost if missing
          if (!itinerary.totalEstimatedCost) {
            itinerary.totalEstimatedCost =
              itinerary.summary?.budgetBreakdown?.total ?? 0;
          }

          // Add currency if missing
          if (!itinerary.currency) {
            itinerary.currency = 'USD';
          }

          return itinerary as GeneratedItinerary;
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
   * Type guard for partial itinerary validation
   */
  private isValidPartialItinerary(obj: unknown): boolean {
    if (!obj || typeof obj !== 'object') return false;

    const candidate = obj as Record<string, unknown>;

    return candidate.days === undefined || Array.isArray(candidate.days);
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.debug(`Could not repair JSON: ${errorMessage}`);
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
            category: ActivityCategory.SIGHTSEEING,
            timeSlot: 'morning',
          },
          {
            name: 'Local Dining Experience',
            description: 'Try authentic local cuisine',
            location: request.destination,
            duration: 90,
            estimatedCost: request.budget / days / 4,
            category: ActivityCategory.FOOD,
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
  ): ActivitySuggestion[] {
    return [
      {
        name: 'Local Market Visit',
        description: 'Explore traditional markets and local culture',
        estimatedCost: 50000,
        duration: 120,
        category: 'cultural',
        reasonForSuggestion: `Matches ${travelStyle} travel style`,
      },
      {
        name: 'Historic Site Tour',
        description: 'Visit important historical landmarks',
        estimatedCost: 80000,
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
    breakdown: Record<string, unknown>;
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

      const costEstimation: unknown = JSON.parse(responseContent);
      return costEstimation as {
        minCost: number;
        maxCost: number;
        averageCost: number;
        currency: string;
        breakdown: Record<string, unknown>;
        notes?: string[];
      };
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
      sightseeing: 50000,
      food: 80000,
      transport: 30000,
      accommodation: 150000,
      shopping: 100000,
      miscellaneous: 25000,
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
      currency: 'VND',
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

  /**
   * Get country-specific cost multiplier for AI context
   */
  private getCountryMultiplierForAI(country: string): number {
    const multipliers: Record<string, number> = {
      vietnam: 0.3,
      thailand: 0.4,
      indonesia: 0.35,
      philippines: 0.4,
      singapore: 1.5,
      japan: 1.8,
      'south korea': 1.2,
      malaysia: 0.5,
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
}
