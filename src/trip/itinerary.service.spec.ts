import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ItineraryService } from './itinerary.service';
import { ItineraryEntity, Activity } from '../schemas/itinerary.entity';
import { TripEntity, TripStatus } from '../schemas/trip.entity';
import { UserEntity } from '../schemas/user.entity';
import { UpdateItineraryDto, GenerateItineraryDto } from './dto/trip.dto';

describe('ItineraryService', () => {
  let itineraryService: ItineraryService;
  let itineraryRepository: jest.Mocked<Repository<ItineraryEntity>>;
  let tripRepository: jest.Mocked<Repository<TripEntity>>;

  const mockTripEntity: TripEntity = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-123',
    title: 'Amazing Japan Trip',
    description: 'Exploring Tokyo and Kyoto',
    destinationName: 'Tokyo, Japan',
    destinationCoords: { lat: 35.6762, lng: 139.6503 },
    startDate: new Date('2024-03-15'),
    endDate: new Date('2024-03-22'),
    budget: 3000.0,
    currency: 'USD',
    status: TripStatus.PLANNING,
    isPublic: false,
    enableCostTracking: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {} as UserEntity,
    itinerary: [],
    shareInfo: undefined,
    budgetTracking: [],
  };

  const mockActivity: Activity = {
    time: '09:00',
    title: 'Arrive at Haneda Airport',
    description: 'Flight arrival and airport transfer',
    location: 'Haneda Airport',
    duration: 120,
    cost: 25.0,
    type: 'transportation',
  };

  const mockItineraryEntity: ItineraryEntity = {
    id: 'itinerary-123',
    tripId: mockTripEntity.id,
    dayNumber: 1,
    date: new Date('2024-03-15'),
    activities: [mockActivity],
    aiGenerated: true,
    userModified: false,
    estimatedCost: 0,
    costCurrency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
    trip: mockTripEntity,
    activityCosts: [],
  };

  beforeEach(async () => {
    const mockItineraryRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const mockTripRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItineraryService,
        {
          provide: getRepositoryToken(ItineraryEntity),
          useValue: mockItineraryRepository,
        },
        {
          provide: getRepositoryToken(TripEntity),
          useValue: mockTripRepository,
        },
      ],
    }).compile();

    itineraryService = module.get<ItineraryService>(ItineraryService);
    itineraryRepository = module.get(getRepositoryToken(ItineraryEntity));
    tripRepository = module.get(getRepositoryToken(TripEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateItinerary', () => {
    const inputGenerateDto: GenerateItineraryDto = {
      preferences: 'Cultural and historical sites',
      interests: ['temples', 'museums', 'food'],
      budgetPreference: 'moderate',
    };

    it('should generate AI itinerary successfully', async () => {
      // Arrange
      tripRepository.findOne.mockResolvedValue(mockTripEntity);
      itineraryRepository.delete.mockResolvedValue({} as DeleteResult);
      itineraryRepository.create.mockReturnValue(mockItineraryEntity);
      itineraryRepository.save.mockResolvedValue(mockItineraryEntity);

      // Act
      const actualResult = await itineraryService.generateItinerary(
        mockTripEntity.id,
        'user-123',
        inputGenerateDto,
      );

      // Assert
      expect(actualResult).toBeInstanceOf(Array);
      expect(actualResult.length).toBeGreaterThan(0);
      expect(tripRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockTripEntity.id, userId: 'user-123' },
      });
      expect(itineraryRepository.delete).toHaveBeenCalledWith({
        tripId: mockTripEntity.id,
      });
      expect(itineraryRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when trip not found', async () => {
      // Arrange
      tripRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        itineraryService.generateItinerary(
          'invalid-id',
          'user-123',
          inputGenerateDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trip has no dates', async () => {
      // Arrange
      const tripWithoutDates = {
        ...mockTripEntity,
        startDate: undefined,
        endDate: undefined,
      };
      tripRepository.findOne.mockResolvedValue(tripWithoutDates);

      // Act & Assert
      await expect(
        itineraryService.generateItinerary(
          mockTripEntity.id,
          'user-123',
          inputGenerateDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateDayItinerary', () => {
    const inputUpdateDto: UpdateItineraryDto = {
      date: '2024-03-15',
      activities: [
        {
          time: '10:00',
          title: 'Updated Activity',
          description: 'Updated description',
          location: 'Updated location',
          duration: 90,
          cost: 30.0,
        },
      ],
      userModified: true,
    };

    it('should update existing day itinerary', async () => {
      // Arrange
      tripRepository.findOne.mockResolvedValue(mockTripEntity);
      itineraryRepository.findOne.mockResolvedValue(mockItineraryEntity);
      itineraryRepository.save.mockResolvedValue({
        ...mockItineraryEntity,
        activities: inputUpdateDto.activities,
        userModified: true,
      });

      // Act
      const actualResult = await itineraryService.updateDayItinerary(
        mockTripEntity.id,
        'user-123',
        1,
        inputUpdateDto,
      );

      // Assert
      expect(actualResult.activities).toEqual(inputUpdateDto.activities);
      expect(actualResult.userModified).toBe(true);
      expect(itineraryRepository.save).toHaveBeenCalled();
    });

    it('should create new day itinerary if none exists', async () => {
      // Arrange
      tripRepository.findOne.mockResolvedValue(mockTripEntity);
      itineraryRepository.findOne.mockResolvedValue(null);
      itineraryRepository.create.mockReturnValue({
        ...mockItineraryEntity,
        activities: inputUpdateDto.activities,
        aiGenerated: false,
        userModified: true,
      });
      itineraryRepository.save.mockResolvedValue({
        ...mockItineraryEntity,
        activities: inputUpdateDto.activities,
        aiGenerated: false,
        userModified: true,
      });

      // Act
      const actualResult = await itineraryService.updateDayItinerary(
        mockTripEntity.id,
        'user-123',
        2,
        inputUpdateDto,
      );

      // Assert
      expect(actualResult.activities).toEqual(inputUpdateDto.activities);
      expect(actualResult.aiGenerated).toBe(false);
      expect(actualResult.userModified).toBe(true);
      expect(itineraryRepository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when trip not found', async () => {
      // Arrange
      tripRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        itineraryService.updateDayItinerary(
          'invalid-id',
          'user-123',
          1,
          inputUpdateDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDayItinerary', () => {
    it('should return day itinerary', async () => {
      // Arrange
      itineraryRepository.findOne.mockResolvedValue(mockItineraryEntity);

      // Act
      const actualResult = await itineraryService.getDayItinerary(
        mockTripEntity.id,
        1,
      );

      // Assert
      expect(actualResult).toEqual(mockItineraryEntity);
      expect(itineraryRepository.findOne).toHaveBeenCalledWith({
        where: { tripId: mockTripEntity.id, dayNumber: 1 },
      });
    });

    it('should return null when day itinerary not found', async () => {
      // Arrange
      itineraryRepository.findOne.mockResolvedValue(null);

      // Act
      const actualResult = await itineraryService.getDayItinerary(
        mockTripEntity.id,
        99,
      );

      // Assert
      expect(actualResult).toBeNull();
    });
  });

  describe('getTripItinerary', () => {
    it('should return all trip itinerary ordered by day', async () => {
      // Arrange
      const mockItineraries = [
        { ...mockItineraryEntity, dayNumber: 1 },
        { ...mockItineraryEntity, dayNumber: 2, id: 'itinerary-456' },
      ];
      itineraryRepository.find.mockResolvedValue(mockItineraries);

      // Act
      const actualResult = await itineraryService.getTripItinerary(
        mockTripEntity.id,
      );

      // Assert
      expect(actualResult).toEqual(mockItineraries);
      expect(itineraryRepository.find).toHaveBeenCalledWith({
        where: { tripId: mockTripEntity.id },
        order: { dayNumber: 'ASC' },
      });
    });
  });
});
