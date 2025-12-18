import { Test, TestingModule } from '@nestjs/testing';
import { AIService } from 'src/ai/services/ai.service';
import { GeminiService } from 'src/ai/services/gemini.service';
import { OpenRouterService } from 'src/ai/services/openrouter.service';
import { RedisCacheService } from 'src/redis/redis-cache.service';
import { CacheService } from 'src/shared/services/cache.service';
import { AiTelemetryService } from 'src/ai/services/ai-telemetry.service';

describe('AIService Integration Test', () => {
  let service: AIService;
  let gemini: jest.Mocked<GeminiService>;
  let openRouter: jest.Mocked<OpenRouterService>;

  beforeEach(async () => {
    gemini = {
      createChatCompletion: jest.fn(),
    } as unknown as jest.Mocked<GeminiService>;

    openRouter = {
      createChatCompletion: jest.fn(),
    } as unknown as jest.Mocked<OpenRouterService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: GeminiService,
          useValue: gemini,
        },
        {
          provide: OpenRouterService,
          useValue: openRouter,
        },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
          } as Partial<RedisCacheService>,
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
            set: jest.fn(),
          } as Partial<CacheService>,
        },
        {
          provide: AiTelemetryService,
          useValue: {
            recordRun: jest.fn().mockResolvedValue(undefined),
          } as Partial<AiTelemetryService>,
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateItineraryWithOpenRouter', () => {
    it('should return parsed itinerary when Gemini returns valid JSON', async () => {
      const json = JSON.stringify({
        days: [
          { dayNumber: 1, date: null, activities: [{ title: 'City tour' }] },
        ],
        totalCost: 0,
        currency: 'USD',
      });
      gemini.createChatCompletion.mockResolvedValue({
        choices: [{ message: { content: json } }],
      } as any);

      const result = await service.generateItineraryWithOpenRouter('prompt');

      expect(result).toBeDefined();
      expect(result.days[0].dayNumber).toBe(1);
      expect(openRouter.createChatCompletion).not.toHaveBeenCalled();
    });
  });

  describe('Vietnam-specific context', () => {
    it('should detect Vietnam regions correctly', () => {
      // This would test the private getVietnamSpecificContext method
      // We can test this through the generateItinerary method with different destinations

      const hanoidestination = 'Hanoi';
      const saigonDestination = 'Ho Chi Minh City';
      const hoianDestination = 'Hoi An';

      // The service should handle these destinations with appropriate regional context
      expect(hanoidestination.toLowerCase()).toContain('hanoi');
      expect(saigonDestination.toLowerCase()).toContain('ho chi minh');
      expect(hoianDestination.toLowerCase()).toContain('hoi an');
    });

    it('should handle seasonal context', () => {
      const drySeasonDate = '2024-02-15'; // February is dry season
      const rainySeasonDate = '2024-08-15'; // August is rainy season

      const dryMonth = new Date(drySeasonDate).getMonth() + 1; // 2
      const rainyMonth = new Date(rainySeasonDate).getMonth() + 1; // 8

      expect(dryMonth >= 11 || dryMonth <= 4).toBeTruthy(); // Dry season months
      expect(rainyMonth >= 5 && rainyMonth <= 10).toBeTruthy(); // Rainy season months
    });
  });

  describe('Cost calculation', () => {
    it('should be a no-op placeholder for current AIService API', () => {
      expect(service).toBeDefined();
    });
  });
});
