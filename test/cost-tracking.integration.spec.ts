import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItineraryService } from '../src/trip/itinerary.service';
import { AIService } from '../src/shared/services/ai.service';
import { CurrencyService } from '../src/currency/services/currency.service';
import { TripEntity } from '../src/schemas/trip.entity';
import { ItineraryEntity } from '../src/schemas/itinerary.entity';
import { ActivityCostEntity } from '../src/schemas/activity-cost.entity';
import { BudgetTrackingEntity } from '../src/schemas/budget-tracking.entity';

describe('Cost Tracking Integration Test', () => {
  let app: INestApplication;
  let itineraryService: ItineraryService;
  let aiService: AIService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [
            TripEntity,
            ItineraryEntity,
            ActivityCostEntity,
            BudgetTrackingEntity,
          ],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([
          TripEntity,
          ItineraryEntity,
          ActivityCostEntity,
          BudgetTrackingEntity,
        ]),
      ],
      providers: [
        ItineraryService,
        AIService,
        {
          provide: CurrencyService,
          useValue: {
            formatCurrency: jest.fn().mockReturnValue('$100.00'),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    itineraryService = moduleFixture.get<ItineraryService>(ItineraryService);
    aiService = moduleFixture.get<AIService>(AIService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(itineraryService).toBeDefined();
    expect(aiService).toBeDefined();
  });

  it('should estimate activity cost correctly', async () => {
    const activity = {
      title: 'Lunch at Local Restaurant',
      description: 'Try local cuisine at a recommended restaurant',
      location: 'Restaurant in Vietnam',
      duration: 90,
      type: 'dining',
    };

    const result = await aiService.estimateActivityCost(
      activity,
      'Vietnam',
      'USD',
    );

    expect(result).toBeDefined();
    expect(result.estimatedCost).toBeGreaterThan(0);
    expect(result.category).toBe('food');
    expect(result.breakdown).toBeDefined();
  });

  it('should format currency correctly with helper method', () => {
    const service = itineraryService as any;
    const formatted = service.formatCurrency(100, 'USD');
    expect(formatted).toMatch(/\$100\.00/);
  });
});
