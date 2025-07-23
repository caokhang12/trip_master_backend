import { Test, TestingModule } from '@nestjs/testing';
import { CostTrackingController } from './cost-tracking.controller';
import { ItineraryService } from './itinerary.service';
import { ResponseUtil } from '../shared/utils/response.util';
import { AuthRequest } from 'src/shared/interfaces/auth.interface';

describe('CostTrackingController', () => {
  let controller: CostTrackingController;
  let itineraryService: jest.Mocked<ItineraryService>;

  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockRequest = { user: mockUser } as AuthRequest;

  beforeEach(async () => {
    const mockItineraryService = {
      getCostAnalysis: jest.fn(),
      getBudgetSummary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CostTrackingController],
      providers: [
        {
          provide: ItineraryService,
          useValue: mockItineraryService,
        },
      ],
    }).compile();

    controller = module.get<CostTrackingController>(CostTrackingController);
    itineraryService = module.get(ItineraryService);
  });

  describe('getCostAnalysis', () => {
    it('should get cost analysis successfully', async () => {
      const tripId = 'trip-123';
      const mockAnalysis = {
        tripId: 'trip-123',
        totalBudget: 1000,
        totalEstimated: 800,
        totalSpent: 750,
        remainingBudget: 250,
        budgetVariance: -50,
        utilizationPercentage: 75,
        currency: 'USD',
        categoryBreakdown: [
          {
            category: 'accommodation',
            budgeted: 400,
            estimated: 380,
            actual: 350,
            variance: -50,
            utilizationPercentage: 87.5,
          },
          {
            category: 'food',
            budgeted: 300,
            estimated: 280,
            actual: 250,
            variance: -50,
            utilizationPercentage: 83.3,
          },
        ],
        lastUpdated: new Date('2024-06-12T10:30:00Z'),
      };

      itineraryService.getCostAnalysis.mockResolvedValue(mockAnalysis);

      const result = await controller.getCostAnalysis(tripId, mockRequest);

      expect(itineraryService.getCostAnalysis).toHaveBeenCalledWith(
        tripId,
        mockUser.id,
      );
      expect(result).toEqual(ResponseUtil.success(mockAnalysis));
    });
  });

  describe('getBudgetSummary', () => {
    it('should get budget summary successfully', async () => {
      const tripId = 'trip-123';
      const mockSummary = {
        totalBudget: 1000,
        totalSpent: 750,
        totalEstimated: 800,
        remainingBudget: 250,
        budgetUtilization: 75,
        currency: 'USD',
        categoryBreakdown: [
          {
            category: 'accommodation',
            budgeted: 400,
            estimated: 380,
            actual: 350,
            variance: -50,
            utilizationPercentage: 87.5,
          },
        ],
        lastUpdated: new Date('2024-06-12T10:30:00Z'),
      };

      itineraryService.getBudgetSummary.mockResolvedValue(mockSummary);

      const result = await controller.getBudgetSummary(tripId, mockRequest);

      expect(itineraryService.getBudgetSummary).toHaveBeenCalledWith(
        tripId,
        mockUser.id,
      );
      expect(result).toEqual(ResponseUtil.success(mockSummary));
    });
  });
});
