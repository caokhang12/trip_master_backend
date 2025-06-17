import { Test, TestingModule } from '@nestjs/testing';
import { ItineraryController } from './itinerary.controller';
import { ItineraryService } from './itinerary.service';
import { ResponseUtil } from '../shared/utils/response.util';
import { HttpStatus } from '@nestjs/common';
import { UpdateItineraryDto, GenerateItineraryDto } from './dto/itinerary.dto';
import { UpdateActivityCostDto } from './dto/cost.dto';
import { AuthRequest } from './interfaces/trip.interface';

describe('ItineraryController', () => {
  let controller: ItineraryController;
  let itineraryService: jest.Mocked<ItineraryService>;

  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockRequest = { user: mockUser } as AuthRequest;

  beforeEach(async () => {
    const mockItineraryService = {
      generateItinerary: jest.fn(),
      updateDayItinerary: jest.fn(),
      updateActivityCost: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItineraryController],
      providers: [
        {
          provide: ItineraryService,
          useValue: mockItineraryService,
        },
      ],
    }).compile();

    controller = module.get<ItineraryController>(ItineraryController);
    itineraryService = module.get(ItineraryService);
  });

  describe('generateItinerary', () => {
    it('should generate AI-powered itinerary successfully', async () => {
      const tripId = 'trip-123';
      const generateDto: GenerateItineraryDto = {
        travelStyle: 'cultural',
        interests: ['temples', 'food'],
        includeCosts: true,
        maxActivitiesPerDay: 5,
      };

      const mockItinerary = [
        {
          id: 'itinerary-123',
          tripId,
          dayNumber: 1,
          activities: [
            {
              time: '09:00',
              title: 'Visit Temple',
              description: 'Explore ancient temple',
              location: 'Temple District',
              duration: 120,
              cost: 25,
              type: 'cultural',
            },
          ],
        },
      ] as any;

      itineraryService.generateItinerary.mockResolvedValue(mockItinerary);

      const result = await controller.generateItinerary(
        mockRequest,
        tripId,
        generateDto,
      );

      expect(itineraryService.generateItinerary).toHaveBeenCalledWith(
        tripId,
        mockUser.id,
        generateDto,
      );
      expect(result).toEqual(
        ResponseUtil.success(mockItinerary, HttpStatus.CREATED),
      );
    });
  });

  describe('updateDayItinerary', () => {
    it('should update day itinerary successfully', async () => {
      const tripId = 'trip-123';
      const dayNumber = '1';
      const updateDto: UpdateItineraryDto = {
        date: '2024-03-15',
        activities: [
          {
            time: '10:00',
            title: 'Updated Activity',
            description: 'Updated description',
            location: 'New Location',
            duration: 90,
            cost: 30,
            type: 'sightseeing',
          },
        ],
        userModified: true,
      };

      const mockUpdatedItinerary = {
        id: 'itinerary-123',
        tripId,
        dayNumber: 1,
        date: updateDto.date,
        activities: updateDto.activities,
        userModified: true,
      } as any;

      itineraryService.updateDayItinerary.mockResolvedValue(
        mockUpdatedItinerary,
      );

      const result = await controller.updateDayItinerary(
        mockRequest,
        tripId,
        dayNumber,
        updateDto,
      );

      expect(itineraryService.updateDayItinerary).toHaveBeenCalledWith(
        tripId,
        mockUser.id,
        parseInt(dayNumber),
        updateDto,
      );
      expect(result).toEqual(ResponseUtil.success(mockUpdatedItinerary));
    });
  });

  describe('updateActivityCost', () => {
    it('should update activity cost successfully', async () => {
      const tripId = 'trip-123';
      const activityId = 'activity-123';
      const updateDto: UpdateActivityCostDto = {
        actualAmount: 45.5,
        notes: 'Included tip',
      };

      const mockResult = {
        id: activityId,
        actualAmount: updateDto.actualAmount,
        notes: updateDto.notes,
        updatedAt: new Date(),
      } as any;

      itineraryService.updateActivityCost.mockResolvedValue(mockResult);

      const result = await controller.updateActivityCost(
        tripId,
        activityId,
        updateDto,
        mockRequest,
      );

      expect(itineraryService.updateActivityCost).toHaveBeenCalledWith(
        tripId,
        mockUser.id,
        activityId,
        updateDto,
      );
      expect(result).toEqual(ResponseUtil.success(mockResult));
    });
  });
});
