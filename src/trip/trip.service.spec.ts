import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, UpdateResult, SelectQueryBuilder } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TripService } from './trip.service';
import { TripEntity, TripStatus } from '../schemas/trip.entity';
import { ItineraryEntity } from '../schemas/itinerary.entity';
import { TripShareEntity } from '../schemas/trip-share.entity';
import { UserEntity } from '../schemas/user.entity';
import {
  CreateTripDto,
  UpdateTripDto,
  TripQueryDto,
  ShareTripDto,
  TripSearchDto,
} from './dto/trip.dto';

describe('TripService', () => {
  let tripService: TripService;
  let tripRepository: jest.Mocked<Repository<TripEntity>>;
  let itineraryRepository: jest.Mocked<Repository<ItineraryEntity>>;
  let tripShareRepository: jest.Mocked<Repository<TripShareEntity>>;

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
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {} as UserEntity,
    itinerary: [],
    shareInfo: undefined,
  };

  const mockItineraryEntity: ItineraryEntity = {
    id: 'itinerary-123',
    tripId: mockTripEntity.id,
    dayNumber: 1,
    date: new Date('2024-03-15'),
    activities: [
      {
        time: '09:00',
        title: 'Arrive at Haneda Airport',
        description: 'Flight arrival and airport transfer',
        location: 'Haneda Airport',
        duration: 120,
        cost: 25.0,
      },
    ],
    aiGenerated: true,
    userModified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    trip: mockTripEntity,
  };

  const mockShareEntity: TripShareEntity = {
    id: 'share-123',
    tripId: mockTripEntity.id,
    shareToken: 'share-token-123',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    viewCount: 0,
    createdAt: new Date(),
    trip: mockTripEntity,
  };

  beforeEach(async () => {
    const mockTripRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
      })),
    };

    const mockItineraryRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    const mockTripShareRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripService,
        {
          provide: getRepositoryToken(TripEntity),
          useValue: mockTripRepository,
        },
        {
          provide: getRepositoryToken(ItineraryEntity),
          useValue: mockItineraryRepository,
        },
        {
          provide: getRepositoryToken(TripShareEntity),
          useValue: mockTripShareRepository,
        },
      ],
    }).compile();

    tripService = module.get<TripService>(TripService);
    tripRepository = module.get(getRepositoryToken(TripEntity));
    itineraryRepository = module.get(getRepositoryToken(ItineraryEntity));
    tripShareRepository = module.get(getRepositoryToken(TripShareEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTrip', () => {
    const inputCreateTripDto: CreateTripDto = {
      title: 'Amazing Japan Trip',
      description: 'Exploring Tokyo and Kyoto',
      destinationName: 'Tokyo, Japan',
      destinationCoords: { lat: 35.6762, lng: 139.6503 },
      startDate: '2024-03-15',
      endDate: '2024-03-22',
      budget: 3000.0,
      currency: 'USD',
    };

    it('should create a new trip successfully', async () => {
      // Arrange
      tripRepository.create.mockReturnValue(mockTripEntity);
      tripRepository.save.mockResolvedValue(mockTripEntity);

      // Act
      const actualResult = await tripService.createTrip(
        'user-123',
        inputCreateTripDto,
      );

      // Assert
      expect(actualResult).toEqual(mockTripEntity);
      expect(tripRepository.create).toHaveBeenCalledWith({
        ...inputCreateTripDto,
        userId: 'user-123',
        startDate: new Date('2024-03-15'),
        endDate: new Date('2024-03-22'),
      });
      expect(tripRepository.save).toHaveBeenCalledWith(mockTripEntity);
    });

    it('should throw BadRequestException for invalid date range', async () => {
      // Arrange
      const invalidDateDto = {
        ...inputCreateTripDto,
        startDate: '2024-03-22',
        endDate: '2024-03-15',
      };

      // Act & Assert
      await expect(
        tripService.createTrip('user-123', invalidDateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserTrips', () => {
    const inputQueryDto: TripQueryDto = {
      page: 1,
      limit: 10,
      status: TripStatus.PLANNING,
    };

    it('should return user trips with pagination', async () => {
      // Arrange
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockTripEntity], 1]),
      } as any as SelectQueryBuilder<TripEntity>;
      tripRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const actualResult = await tripService.getUserTrips(
        'user-123',
        inputQueryDto,
      );

      // Assert
      expect(actualResult).toEqual({
        items: [mockTripEntity],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'trip.userId = :userId',
        { userId: 'user-123' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'trip.status = :status',
        { status: TripStatus.PLANNING },
      );
    });
  });

  describe('getTripById', () => {
    it('should return trip with itinerary for owner', async () => {
      // Arrange
      const tripWithItinerary = {
        ...mockTripEntity,
        itinerary: [mockItineraryEntity],
      };
      tripRepository.findOne.mockResolvedValue(tripWithItinerary);

      // Act
      const actualResult = await tripService.getTripById(
        mockTripEntity.id,
        'user-123',
      );

      // Assert
      expect(actualResult).toEqual(tripWithItinerary);
      expect(tripRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockTripEntity.id },
        relations: ['itinerary', 'shareInfo'],
        order: { itinerary: { dayNumber: 'ASC' } },
      });
    });

    it('should throw NotFoundException when trip does not exist', async () => {
      // Arrange
      tripRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        tripService.getTripById('invalid-id', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner accessing private trip', async () => {
      // Arrange
      tripRepository.findOne.mockResolvedValue(mockTripEntity);

      // Act & Assert
      await expect(
        tripService.getTripById(mockTripEntity.id, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateTrip', () => {
    const inputUpdateDto: UpdateTripDto = {
      title: 'Updated Trip Title',
      budget: 3500.0,
    };

    it('should update trip successfully', async () => {
      // Arrange
      tripRepository.findOne
        .mockResolvedValueOnce(mockTripEntity) // For ownership validation
        .mockResolvedValueOnce({
          ...mockTripEntity,
          title: inputUpdateDto.title || mockTripEntity.title,
          budget: inputUpdateDto.budget || mockTripEntity.budget,
        }); // For return value
      tripRepository.update.mockResolvedValue({ affected: 1 } as UpdateResult);

      // Act
      const actualResult = await tripService.updateTrip(
        mockTripEntity.id,
        'user-123',
        inputUpdateDto,
      );

      // Assert
      expect(actualResult.title).toBe(inputUpdateDto.title);
      expect(actualResult.budget).toBe(inputUpdateDto.budget);
      expect(tripRepository.update).toHaveBeenCalledWith(
        mockTripEntity.id,
        inputUpdateDto,
      );
    });

    it('should throw NotFoundException for non-existent trip', async () => {
      // Arrange
      tripRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        tripService.updateTrip('invalid-id', 'user-123', inputUpdateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate status transitions', async () => {
      // Arrange
      const completedTrip = { ...mockTripEntity, status: TripStatus.COMPLETED };
      tripRepository.findOne.mockResolvedValue(completedTrip);

      const invalidUpdateDto = { status: TripStatus.PLANNING };

      // Act & Assert
      await expect(
        tripService.updateTrip(mockTripEntity.id, 'user-123', invalidUpdateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteTrip', () => {
    it('should delete trip successfully', async () => {
      // Arrange
      tripRepository.findOne.mockResolvedValue(mockTripEntity);
      tripRepository.remove.mockResolvedValue(mockTripEntity);

      // Act
      const actualResult = await tripService.deleteTrip(
        mockTripEntity.id,
        'user-123',
      );

      // Assert
      expect(actualResult).toBe(true);
      expect(tripRepository.remove).toHaveBeenCalledWith(mockTripEntity);
    });

    it('should throw NotFoundException for non-existent trip', async () => {
      // Arrange
      tripRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        tripService.deleteTrip('invalid-id', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateShareLink', () => {
    const inputShareDto: ShareTripDto = {
      expiresAt: '2024-04-01T00:00:00Z',
    };

    it('should generate new share link', async () => {
      // Arrange
      tripRepository.findOne.mockResolvedValue(mockTripEntity);
      tripShareRepository.findOne.mockResolvedValue(null);
      tripShareRepository.create.mockReturnValue(mockShareEntity);
      tripShareRepository.save.mockResolvedValue(mockShareEntity);

      // Act
      const actualResult = await tripService.generateShareLink(
        mockTripEntity.id,
        'user-123',
        inputShareDto,
      );

      // Assert
      expect(actualResult).toEqual(mockShareEntity);
      expect(tripShareRepository.create).toHaveBeenCalledWith({
        tripId: mockTripEntity.id,
        shareToken: expect.any(String),
        expiresAt: new Date(inputShareDto.expiresAt!),
        viewCount: 0,
      });
    });

    it('should update existing share link', async () => {
      // Arrange
      tripRepository.findOne.mockResolvedValue(mockTripEntity);
      tripShareRepository.findOne.mockResolvedValue(mockShareEntity);
      tripShareRepository.save.mockResolvedValue(mockShareEntity);

      // Act
      const actualResult = await tripService.generateShareLink(
        mockTripEntity.id,
        'user-123',
        inputShareDto,
      );

      // Assert
      expect(actualResult).toEqual(mockShareEntity);
      expect(tripShareRepository.save).toHaveBeenCalledWith(mockShareEntity);
    });
  });

  describe('getSharedTrip', () => {
    it('should return shared trip and increment view count', async () => {
      // Arrange
      const shareWithTrip = {
        ...mockShareEntity,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Always 7 days in the future
        trip: { ...mockTripEntity, itinerary: [mockItineraryEntity] },
      };
      tripShareRepository.findOne.mockResolvedValue(shareWithTrip);
      tripShareRepository.update.mockResolvedValue({
        affected: 1,
      } as UpdateResult);

      // Act
      const actualResult = await tripService.getSharedTrip('share-token-123');

      // Assert
      expect(actualResult.id).toBe(mockTripEntity.id);
      expect(actualResult.itinerary).toEqual([mockItineraryEntity]);
      expect(actualResult.shareInfo).toEqual(
        expect.objectContaining({
          id: mockShareEntity.id,
          tripId: mockShareEntity.tripId,
          shareToken: mockShareEntity.shareToken,
          viewCount: mockShareEntity.viewCount,
          createdAt: mockShareEntity.createdAt,
          // Don't check expiresAt as it's dynamically set in the test
        }),
      );
      expect(tripShareRepository.update).toHaveBeenCalledWith(
        mockShareEntity.id,
        {
          viewCount: 1,
        },
      );
    });

    it('should throw NotFoundException for invalid share token', async () => {
      // Arrange
      tripShareRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(tripService.getSharedTrip('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for expired share link', async () => {
      // Arrange
      const expiredShare = {
        ...mockShareEntity,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      };
      tripShareRepository.findOne.mockResolvedValue(expiredShare);

      // Act & Assert
      await expect(tripService.getSharedTrip('expired-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('searchTrips', () => {
    const inputSearchDto: TripSearchDto = {
      query: 'Japan',
      page: 1,
      limit: 10,
    };

    it('should search trips successfully', async () => {
      // Arrange
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockTripEntity], 1]),
      } as any as SelectQueryBuilder<TripEntity>;
      tripRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const actualResult = await tripService.searchTrips(
        'user-123',
        inputSearchDto,
      );

      // Assert
      expect(actualResult).toEqual({
        items: [mockTripEntity],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(trip.title ILIKE :query OR trip.description ILIKE :query OR trip.destinationName ILIKE :query)',
        { query: '%Japan%' },
      );
    });
  });

  describe('duplicateTrip', () => {
    it('should duplicate trip successfully', async () => {
      // Arrange
      const originalTripWithItinerary = {
        ...mockTripEntity,
        itinerary: [mockItineraryEntity],
      };
      tripRepository.findOne.mockResolvedValue(originalTripWithItinerary);
      tripRepository.create.mockReturnValue({
        ...mockTripEntity,
        title: 'Amazing Japan Trip (Copy)',
      });
      tripRepository.save.mockResolvedValue({
        ...mockTripEntity,
        title: 'Amazing Japan Trip (Copy)',
      });
      itineraryRepository.create.mockReturnValue(mockItineraryEntity);
      itineraryRepository.save.mockResolvedValue(mockItineraryEntity);

      // Act
      const actualResult = await tripService.duplicateTrip(
        mockTripEntity.id,
        'user-123',
      );

      // Assert
      expect(actualResult.title).toBe('Amazing Japan Trip (Copy)');
      expect(tripRepository.save).toHaveBeenCalled();
      expect(itineraryRepository.save).toHaveBeenCalled();
    });
  });
});
