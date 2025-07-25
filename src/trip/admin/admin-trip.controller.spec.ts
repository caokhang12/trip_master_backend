import { Test, TestingModule } from '@nestjs/testing';
import { AdminTripController } from './admin-trip.controller';
import { AdminTripService } from './admin-trip.service';
import { ResponseUtil } from '../../shared/utils/response.util';
import { PaginationHelper } from '../../shared/types/pagination.types';
import { TripStatus } from '../../schemas/trip.entity';
import { AdminTripQueryDto, AdminTripResponseDto } from './dto/admin-trip.dto';

describe('AdminTripController', () => {
  let controller: AdminTripController;
  let service: AdminTripService;

  const mockAdminTripService = {
    getAllTrips: jest.fn(),
    getTripById: jest.fn(),
  };

  const mockTripResponse: AdminTripResponseDto = {
    id: 'trip-123',
    title: 'Test Trip',
    description: 'Test trip description',
    status: TripStatus.PLANNING,
    destinationName: 'Tokyo, Japan',
    destinationCountry: 'JP',
    destinationCity: 'Tokyo',
    startDate: new Date('2023-08-15'),
    endDate: new Date('2023-08-22'),
    createdAt: new Date('2023-07-01'),
    updatedAt: new Date('2023-07-02'),
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    isShared: true,
    shareToken: 'abc123xyz',
    user: {
      id: 'user-123',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: new Date('2023-06-01'),
    },
    statistics: {
      itineraryCount: 7,
      totalActivities: 23,
      estimatedCost: 1250.5,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminTripController],
      providers: [
        {
          provide: AdminTripService,
          useValue: mockAdminTripService,
        },
      ],
    }).compile();

    controller = module.get<AdminTripController>(AdminTripController);
    service = module.get<AdminTripService>(AdminTripService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTrips', () => {
    it('should return paginated trips with default parameters', async () => {
      const queryDto: AdminTripQueryDto = {};
      const mockPaginationResult = PaginationHelper.createResult(
        [mockTripResponse],
        1,
        1,
        10,
      );

      mockAdminTripService.getAllTrips.mockResolvedValue(mockPaginationResult);

      const result = await controller.getAllTrips(queryDto);

      expect(service.getAllTrips).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(ResponseUtil.success(mockPaginationResult));
    });

    it('should return paginated trips with custom filtering', async () => {
      const queryDto: AdminTripQueryDto = {
        page: 2,
        limit: 5,
        search: 'Tokyo',
        status: TripStatus.PLANNING,
        userEmail: 'user@example.com',
        destinationCountry: 'JP',
        sortBy: 'createdAt',
        sortOrder: 'ASC',
      };

      const mockPaginationResult = PaginationHelper.createResult(
        [mockTripResponse],
        15,
        2,
        5,
      );

      mockAdminTripService.getAllTrips.mockResolvedValue(mockPaginationResult);

      const result = await controller.getAllTrips(queryDto);

      expect(service.getAllTrips).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(ResponseUtil.success(mockPaginationResult));
    });

    it('should handle date range filtering', async () => {
      const queryDto: AdminTripQueryDto = {
        createdAfter: '2023-01-01',
        createdBefore: '2023-12-31',
        startDateAfter: '2023-06-01',
        startDateBefore: '2023-12-31',
        isShared: true,
      };

      const mockPaginationResult = PaginationHelper.createResult(
        [mockTripResponse],
        1,
        1,
        10,
      );

      mockAdminTripService.getAllTrips.mockResolvedValue(mockPaginationResult);

      const result = await controller.getAllTrips(queryDto);

      expect(service.getAllTrips).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(ResponseUtil.success(mockPaginationResult));
    });

    it('should handle empty results', async () => {
      const queryDto: AdminTripQueryDto = {
        search: 'nonexistent',
      };

      const mockPaginationResult = PaginationHelper.createResult([], 0, 1, 10);

      mockAdminTripService.getAllTrips.mockResolvedValue(mockPaginationResult);

      const result = await controller.getAllTrips(queryDto);

      expect(service.getAllTrips).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(ResponseUtil.success(mockPaginationResult));
      expect(result.data.items).toHaveLength(0);
      expect(result.data.meta.total).toBe(0);
    });
  });

  describe('getTripById', () => {
    it('should return trip details by ID', async () => {
      const tripId = 'trip-123';
      mockAdminTripService.getTripById.mockResolvedValue(mockTripResponse);

      const result = await controller.getTripById(tripId);

      expect(service.getTripById).toHaveBeenCalledWith(tripId);
      expect(result).toEqual(ResponseUtil.success(mockTripResponse));
    });

    it('should include all trip details and statistics', async () => {
      const tripId = 'trip-123';
      mockAdminTripService.getTripById.mockResolvedValue(mockTripResponse);

      const result = await controller.getTripById(tripId);

      expect(result.data).toHaveProperty('id', tripId);
      expect(result.data).toHaveProperty('user');
      expect(result.data).toHaveProperty('statistics');
      expect(result.data.statistics).toHaveProperty('itineraryCount');
      expect(result.data.statistics).toHaveProperty('totalActivities');
      expect(result.data.statistics).toHaveProperty('estimatedCost');
    });

    it('should include sharing information when trip is shared', async () => {
      const tripId = 'trip-123';
      const sharedTrip = {
        ...mockTripResponse,
        isShared: true,
        shareToken: 'share-token-123',
      };

      mockAdminTripService.getTripById.mockResolvedValue(sharedTrip);

      const result = await controller.getTripById(tripId);

      expect(result.data.isShared).toBe(true);
      expect(result.data.shareToken).toBe('share-token-123');
    });

    it('should include user information', async () => {
      const tripId = 'trip-123';
      mockAdminTripService.getTripById.mockResolvedValue(mockTripResponse);

      const result = await controller.getTripById(tripId);

      expect(result.data.user).toHaveProperty('id');
      expect(result.data.user).toHaveProperty('email');
      expect(result.data.user).toHaveProperty('firstName');
      expect(result.data.user).toHaveProperty('lastName');
      expect(result.data.user).toHaveProperty('createdAt');
    });
  });

  describe('Error handling', () => {
    it('should handle service errors gracefully', async () => {
      const queryDto: AdminTripQueryDto = {};
      mockAdminTripService.getAllTrips.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.getAllTrips(queryDto)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle trip not found error', async () => {
      const tripId = 'nonexistent-trip';
      mockAdminTripService.getTripById.mockRejectedValue(
        new Error('Trip not found'),
      );

      await expect(controller.getTripById(tripId)).rejects.toThrow(
        'Trip not found',
      );
    });
  });
});
