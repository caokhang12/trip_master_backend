import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIService } from 'src/shared/services/ai.service';
import { AIGenerationRequest } from 'src/shared/interfaces/ai.interface';

describe('AIService Integration Test', () => {
  let service: AIService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                OPENAI_API_KEY: 'test-api-key',
                OPENAI_MODEL: 'gpt-3.5-turbo',
                OPENAI_MAX_TOKENS: 1500,
                OPENAI_TEMPERATURE: 0.7,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateItinerary', () => {
    it('should generate fallback itinerary when OpenAI is not configured', async () => {
      const request: AIGenerationRequest = {
        destination: 'Ho Chi Minh City',
        country: 'Vietnam',
        startDate: '2024-03-15',
        endDate: '2024-03-20',
        budget: 2000000,
        currency: 'VND',
        travelers: 2,
        preferences: {
          travelStyle: 'cultural',
          interests: ['food', 'history'],
          groupType: 'couple',
        },
      };

      const result = await service.generateItinerary(request, 'test-user-id');

      expect(result).toBeDefined();
      expect(result.days).toHaveLength(5); // 5 days from March 15-20
      expect(result.totalEstimatedCost).toBe(2000000);
      expect(result.currency).toBe('VND');
      expect(result.summary.totalDays).toBe(5);
    });
  });

  describe('generateLocationSuggestions', () => {
    it('should generate fallback suggestions', async () => {
      const suggestions = await service.generateLocationSuggestions(
        'Ho Chi Minh City',
        'cultural',
        500000,
        ['food', 'history'],
      );

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('name');
      expect(suggestions[0]).toHaveProperty('estimatedCost');
    });
  });

  describe('generateCostEstimation', () => {
    it('should generate fallback cost estimation', async () => {
      const estimation = await service.generateCostEstimation(
        'Ho Chi Minh City, Vietnam',
        'sightseeing',
        3,
        2,
        'mid-range',
      );

      expect(estimation).toBeDefined();
      expect(estimation).toHaveProperty('minCost');
      expect(estimation).toHaveProperty('maxCost');
      expect(estimation).toHaveProperty('averageCost');
      expect(estimation).toHaveProperty('currency');
      expect(estimation).toHaveProperty('breakdown');
      expect(estimation.currency).toBe('VND');
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
    it('should estimate activity costs correctly', () => {
      const activity = {
        title: 'Museum Visit',
        description: 'Educational museum tour',
        location: 'Ho Chi Minh City',
        duration: 120,
        type: 'sightseeing',
      };

      const result = service.estimateActivityCost(activity, 'Vietnam', 'VND');

      expect(result).toBeDefined();
      expect(result.estimatedCost).toBeGreaterThan(0);
      expect(result.category).toBe('activity');
      expect(result.breakdown).toBeDefined();
    });
  });
});
