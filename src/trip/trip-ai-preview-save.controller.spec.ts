import { Test, TestingModule } from '@nestjs/testing';
import { TripAIController } from './trip-ai.controller';
import { AIService } from '../shared/services/ai.service';
import { ItineraryService } from './itinerary.service';
import { ResponseUtil } from '../shared/utils/response.util';
import { HttpStatus } from '@nestjs/common';
import {
  GenerateItineraryDto,
  UserTravelPreferencesDto,
} from '../shared/dto/ai-request.dto';
import {
  SaveGeneratedItineraryDto,
  SaveItineraryResponseDto,
} from '../shared/dto/save-itinerary.dto';
import { AuthRequest } from '../shared/interfaces/auth.interface';

describe('TripAIController - New Preview and Save Flow', () => {
  let controller: TripAIController;
  let aiService: jest.Mocked<AIService>;
  let itineraryService: jest.Mocked<ItineraryService>;

  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockRequest = { user: mockUser } as AuthRequest;

  beforeEach(async () => {
    const mockAIService = {
      generateItinerary: jest.fn(),
    };

    const mockItineraryService = {
      saveGeneratedItinerary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TripAIController],
      providers: [
        {
          provide: AIService,
          useValue: mockAIService,
        },
        {
          provide: ItineraryService,
          useValue: mockItineraryService,
        },
      ],
    }).compile();

    controller = module.get<TripAIController>(TripAIController);
    aiService = module.get(AIService);
    itineraryService = module.get(ItineraryService);
  });

  describe('generateItineraryPreview', () => {
    it('should generate AI itinerary preview without saving to database', async () => {
      const tripId = 'trip-123';
      const generateDto: GenerateItineraryDto = {
        destination: 'Ho Chi Minh City',
        country: 'Vietnam',
        startDate: '2024-03-15',
        endDate: '2024-03-19',
        budget: 1000000,
        currency: 'VND',
        travelers: 2,
        preferences: {
          travelStyle: 'cultural',
          interests: ['food', 'history'],
          dietaryRestrictions: [],
          accessibilityNeeds: [],
          transportPreference: 'mixed',
          activityLevel: 'moderate',
          groupType: 'couple',
        } as UserTravelPreferencesDto,
        accommodationLocation: 'District 1',
      };

      const mockGeneratedItinerary = {
        days: [
          {
            dayNumber: 1,
            date: '2024-03-15',
            activities: [
              {
                name: 'Ben Thanh Market Tour',
                description: 'Explore local cuisine and culture',
                location: 'Ben Thanh Market',
                duration: 120,
                estimatedCost: 150000,
                category: 'food',
                timeSlot: 'morning',
                localTips: ['Arrive early'],
                bookingRequired: false,
              },
            ],
            dailyBudget: 200000,
            transportationNotes: 'Use local transport',
          },
        ],
        summary: {
          totalDays: 5,
          highlights: ['Cultural exploration'],
          budgetBreakdown: {
            total: 1000000,
            accommodation: 400000,
            food: 300000,
            activities: 200000,
            transportation: 100000,
          },
        },
        culturalContext: {
          country: 'Vietnam',
          currency: 'VND',
          tipping: 'Not mandatory',
          safetyTips: ['Stay hydrated'],
        },
        totalEstimatedCost: 1000000,
        currency: 'VND',
      };

      aiService.generateItinerary.mockResolvedValue(mockGeneratedItinerary);

      const result = await controller.generateItineraryPreview(
        mockRequest,
        tripId,
        generateDto,
      );

      expect(aiService.generateItinerary).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: 'Ho Chi Minh City',
          country: 'Vietnam',
          budget: 1000000,
        }),
        mockUser.id,
      );

      expect(result).toEqual(
        ResponseUtil.success(mockGeneratedItinerary, HttpStatus.OK),
      );

      // Verify that no save operation was called
      expect(itineraryService.saveGeneratedItinerary).not.toHaveBeenCalled();
    });
  });

  describe('saveGeneratedItinerary', () => {
    it('should save generated itinerary when user chooses to save', async () => {
      const tripId = 'trip-123';
      const saveDto: SaveGeneratedItineraryDto = {
        saveToDatabase: true,
        itinerary: {
          days: [
            {
              dayNumber: 1,
              date: '2024-03-15',
              activities: [
                {
                  name: 'Test Activity',
                  description: 'Test Description',
                  location: 'Test Location',
                  duration: 120,
                  estimatedCost: 100000,
                  category: 'cultural',
                  timeSlot: 'morning',
                  localTips: ['Test tip'],
                  bookingRequired: false,
                },
              ],
              dailyBudget: 200000,
              transportationNotes: 'Test transport',
            },
          ],
          summary: {
            totalDays: 1,
            highlights: ['Test highlight'],
            budgetBreakdown: {
              total: 200000,
              accommodation: 80000,
              food: 60000,
              activities: 40000,
              transportation: 20000,
            },
          },
          culturalContext: {
            country: 'Vietnam',
            currency: 'VND',
            tipping: 'Not mandatory',
            safetyTips: ['Stay safe'],
          },
          totalEstimatedCost: 200000,
          currency: 'VND',
        } as any,
        notes: 'Test notes',
      };

      const mockSaveResponse: SaveItineraryResponseDto = {
        saved: true,
        message: 'Itinerary saved successfully with 1 days',
        itineraryIds: ['itinerary-id-123'],
      };

      itineraryService.saveGeneratedItinerary.mockResolvedValue(
        mockSaveResponse,
      );

      const result = await controller.saveGeneratedItinerary(
        mockRequest,
        tripId,
        saveDto,
      );

      expect(itineraryService.saveGeneratedItinerary).toHaveBeenCalledWith(
        tripId,
        mockUser.id,
        saveDto,
      );

      expect(result).toEqual(
        ResponseUtil.success(mockSaveResponse, HttpStatus.CREATED),
      );
    });

    it('should not save when user chooses not to save', async () => {
      const tripId = 'trip-123';
      const saveDto: SaveGeneratedItineraryDto = {
        saveToDatabase: false,
        itinerary: {} as any,
        notes: 'User decided not to save',
      };

      const mockNotSaveResponse: SaveItineraryResponseDto = {
        saved: false,
        message: 'Itinerary not saved as per user preference',
      };

      itineraryService.saveGeneratedItinerary.mockResolvedValue(
        mockNotSaveResponse,
      );

      const result = await controller.saveGeneratedItinerary(
        mockRequest,
        tripId,
        saveDto,
      );

      expect(itineraryService.saveGeneratedItinerary).toHaveBeenCalledWith(
        tripId,
        mockUser.id,
        saveDto,
      );

      expect(result).toEqual(
        ResponseUtil.success(mockNotSaveResponse, HttpStatus.CREATED),
      );
    });
  });
});
