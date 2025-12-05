import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { OpenRouterService } from './openrouter.service';
import { GeminiService } from './gemini.service';
import { GeneratedItinerary } from '../dto/generated-itinerary.dto';
import Ajv, { JSONSchemaType } from 'ajv';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private ajv: Ajv;
  private itinerarySchema: JSONSchemaType<GeneratedItinerary>;

  constructor(
    private gemini: GeminiService,
    private openRouter: OpenRouterService,
  ) {
    this.ajv = new Ajv({ strict: false });
    this.itinerarySchema = {
      type: 'object',
      properties: {
        days: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dayNumber: { type: 'number' },
              date: { type: 'string', nullable: true },
              activities: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    time: { type: 'string', nullable: true },
                    title: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    durationMinutes: { type: 'number', nullable: true },
                    cost: { type: 'number', nullable: true },
                    currency: { type: 'string', nullable: true },
                  },
                  required: ['title'],
                  additionalProperties: true,
                },
              },
            },
            required: ['dayNumber', 'activities'],
            additionalProperties: true,
          },
        },
        totalCost: { type: 'number', nullable: true },
        currency: { type: 'string', nullable: true },
      },
      required: ['days'],
      additionalProperties: true,
    };
  }

  private extractContent(resp: any): string | undefined {
    const choices = resp?.choices;
    if (!choices || !Array.isArray(choices)) return undefined;
    const first = choices[0];
    return first?.message?.content ?? first?.text ?? undefined;
  }

  private tryParseJson(text: string): any {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      // try to extract first JSON object or array
      const m = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/m);
      if (m) {
        try {
          return JSON.parse(m[0]);
        } catch (e2) {
          // last resort: remove markdown fences and try again
          const cleaned = text.replace(/```[\s\S]*?```/g, '').trim();
          const m2 = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/m);
          if (m2) {
            return JSON.parse(m2[0]);
          }
        }
      }
      return null;
    }
  }

  /**
   * Generate itinerary using Gemini as primary provider with OpenRouter fallback
   */
  async generateItineraryWithOpenRouter(
    prompt: string,
  ): Promise<GeneratedItinerary> {
    let lastError: Error | null = null;

    // Try Gemini first
    try {
      this.logger.log('Attempting to generate itinerary with Gemini...');
      return await this.generateWithGemini(prompt);
    } catch (err: any) {
      lastError = err;
      this.logger.warn(
        `Gemini request failed: ${err?.message}. Falling back to OpenRouter...`,
      );
    }

    // Fallback to OpenRouter
    try {
      this.logger.log('Attempting to generate itinerary with OpenRouter...');
      return await this.generateWithOpenRouter(prompt);
    } catch (err: any) {
      this.logger.error(`OpenRouter request also failed: ${err?.message}`, err);
      throw new BadRequestException(
        'Both AI providers failed. Unable to generate itinerary.',
      );
    }
  }

  /**
   * Generate itinerary specifically with Gemini
   * Uses simple string prompt format as per Google Gen AI SDK specs
   */
  private async generateWithGemini(
    prompt: string,
  ): Promise<GeneratedItinerary> {
    const payload = {
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    };

    const resp = await this.gemini.createChatCompletion(payload);
    return this.parseAndValidateResponse(resp, 'Gemini');
  }

  /**
   * Generate itinerary specifically with OpenRouter
   * Uses message array format with system prompt
   */
  private async generateWithOpenRouter(
    prompt: string,
  ): Promise<GeneratedItinerary> {
    const payload = {
      messages: [
        {
          role: 'system',
          content:
            'You are a travel assistant that must return pure JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    };

    const resp = await this.openRouter.createChatCompletion(payload);
    return this.parseAndValidateResponse(resp, 'OpenRouter');
  }

  /**
   * Extract content from AI response, parse JSON, and validate against schema
   */
  private parseAndValidateResponse(
    resp: any,
    provider: string,
  ): GeneratedItinerary {
    const content = this.extractContent(resp);
    if (!content) {
      this.logger.error(`No content in ${provider} response`, resp);
      throw new BadRequestException(`Empty response from ${provider}`);
    }

    const parsed = this.tryParseJson(content);
    if (!parsed) {
      this.logger.warn(
        `Failed to parse ${provider} response as JSON`,
        content?.slice?.(0, 500),
      );
      throw new BadRequestException(`${provider} returned invalid JSON`);
    }

    const validate = this.ajv.validate(this.itinerarySchema as any, parsed);
    if (!validate) {
      this.logger.warn(
        `${provider} JSON failed schema validation`,
        this.ajv.errors,
      );
      throw new BadRequestException(
        `${provider} returned JSON that does not match expected schema`,
      );
    }

    this.logger.log(`Successfully generated itinerary with ${provider}`);
    return parsed as GeneratedItinerary;
  }
}
