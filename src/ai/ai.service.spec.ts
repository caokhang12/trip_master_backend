import { BadRequestException } from '@nestjs/common';
import { AIService } from './services/ai.service';
import { GeminiService } from './services/gemini.service';
import { OpenRouterService } from './services/openrouter.service';
import { RedisCacheService } from '../redis/redis-cache.service';
import { CacheService } from '../shared/services/cache.service';
import { AiTelemetryService } from './services/ai-telemetry.service';

const validItineraryJson = JSON.stringify({
  days: [
    {
      dayNumber: 1,
      date: '2025-01-01',
      activities: [
        {
          time: '09:00',
          title: 'City tour',
          description: null,
          durationMinutes: null,
          cost: 50,
          currency: 'USD',
        },
      ],
    },
  ],
  totalCost: 50,
  currency: 'USD',
});

describe('AIService JSON validation', () => {
  let gemini: jest.Mocked<GeminiService>;
  let openRouter: jest.Mocked<OpenRouterService>;
  let redisCache: jest.Mocked<RedisCacheService>;
  let cache: jest.Mocked<CacheService>;
  let telemetry: jest.Mocked<AiTelemetryService>;
  let service: AIService;

  beforeEach(() => {
    gemini = {
      createChatCompletion: jest.fn(),
    } as unknown as jest.Mocked<GeminiService>;

    openRouter = {
      createChatCompletion: jest.fn(),
    } as unknown as jest.Mocked<OpenRouterService>;

    redisCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RedisCacheService>;

    cache = {
      get: jest.fn().mockReturnValue(undefined),
      set: jest.fn(),
    } as unknown as jest.Mocked<CacheService>;

    telemetry = {
      recordRun: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AiTelemetryService>;

    service = new AIService(gemini, openRouter, redisCache, cache, telemetry);
  });

  it('accepts valid JSON from primary provider', async () => {
    gemini.createChatCompletion.mockResolvedValue({
      choices: [{ message: { content: validItineraryJson } }],
    });

    const result = await service.generateItineraryWithOpenRouter('prompt');

    expect(result.days[0].dayNumber).toBe(1);
    expect(result.currency).toBe('USD');
    expect(gemini.createChatCompletion).toHaveBeenCalled();
    expect(openRouter.createChatCompletion).not.toHaveBeenCalled();
  });

  it('falls back to OpenRouter when Gemini returns invalid JSON', async () => {
    gemini.createChatCompletion.mockResolvedValue({
      choices: [{ message: { content: 'not-json' } }],
    });
    openRouter.createChatCompletion.mockResolvedValue({
      choices: [{ message: { content: validItineraryJson } }],
    });

    const result = await service.generateItineraryWithOpenRouter('prompt');

    expect(result.totalCost).toBe(50);
    expect(openRouter.createChatCompletion).toHaveBeenCalled();
  });

  it('throws BadRequestException when both providers return invalid JSON', async () => {
    gemini.createChatCompletion.mockResolvedValue({
      choices: [{ message: { content: 'broken' } }],
    });
    openRouter.createChatCompletion.mockResolvedValue({
      choices: [{ message: { content: 'still broken' } }],
    });

    await expect(
      service.generateItineraryWithOpenRouter('prompt'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
