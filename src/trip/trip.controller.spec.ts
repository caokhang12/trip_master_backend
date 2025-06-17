import { Test, TestingModule } from '@nestjs/testing';
import { TripController } from './trip.controller';
import { PublicTripController } from './public-trip.controller';
import { TripService } from './trip.service';
import { ItineraryService } from './itinerary.service';
import { CountryDefaultsService } from '../shared/services/country-defaults.service';
import { ResponseUtil } from '../shared/utils/response.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HttpStatus } from '@nestjs/common';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateTripDto, UpdateTripDto } from './dto/trip.dto';
import {
  TripQueryDto,
  ShareTripDto,
  TripSearchDto,
} from './dto/trip-search.dto';
import { TripStatus } from '../schemas/trip.entity';
import { AuthRequest } from './interfaces/trip.interface';

/**
 * Unit tests for TripController and PublicTripController
 */
describe('TripController', () => {
  let controller: TripController;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    role: 'user',
  };

  const mockTrip = {
    id: '1',
    title: 'Test Trip',
    description: 'Test Description',
    destinationName: 'Paris',
    startDate: '2025-07-01',
    endDate: '2025-07-07',
    status: TripStatus.PLANNING,
    userId: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTripService = {
    createTrip: jest.fn(),
    findUserTrips: jest.fn(),
    findTripById: jest.fn(),
    updateTrip: jest.fn(),
    deleteTrip: jest.fn(),
    generateShareLink: jest.fn(),
    duplicateTrip: jest.fn(),
    searchTripsByQuery: jest.fn(),
    findSharedTripByToken: jest.fn(),
  };

  const mockItineraryService = {
    // Itinerary methods are now in separate controller
  };

  const mockCountryDefaultsService = {
    getCountryDefaults: jest.fn(),
    getDefaultCurrency: jest.fn(),
    getDefaultTimezone: jest.fn(),
    getDefaultLanguage: jest.fn(),
    applyCountryDefaults: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TripController, PublicTripController],
      providers: [
        {
          provide: TripService,
          useValue: mockTripService,
        },
        {
          provide: ItineraryService,
          useValue: mockItineraryService,
        },
        {
          provide: CountryDefaultsService,
          useValue: mockCountryDefaultsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TripController>(TripController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTrip', () => {
    it('should create a new trip successfully', async () => {
      const inputCreateTripDto: CreateTripDto = {
        title: 'Test Trip',
        description: 'Test Description',
        destinationName: 'Paris',
        startDate: '2025-07-01',
        endDate: '2025-07-07',
      };

      mockTripService.createTrip.mockResolvedValue(mockTrip);
      const mockRequest = { user: mockUser } as AuthRequest;

      const actualResult = await controller.createTrip(
        mockRequest,
        inputCreateTripDto,
      );

      expect(mockTripService.createTrip).toHaveBeenCalledWith(
        mockUser.id,
        inputCreateTripDto,
      );
      expect(actualResult).toEqual(
        ResponseUtil.success(mockTrip, HttpStatus.CREATED),
      );
    });

    it('should handle service errors during trip creation', async () => {
      const inputCreateTripDto: CreateTripDto = {
        title: 'Test Trip',
        description: 'Test Description',
        destinationName: 'Paris',
        startDate: '2025-07-01',
        endDate: '2025-07-07',
      };

      const mockError = new BadRequestException('Invalid data');
      mockTripService.createTrip.mockRejectedValue(mockError);
      const mockRequest = { user: mockUser } as AuthRequest;

      await expect(
        controller.createTrip(mockRequest, inputCreateTripDto),
      ).rejects.toThrow(mockError);
    });
  });

  describe('findUserTrips', () => {
    it('should return user trips with pagination', async () => {
      const inputQueryDto: TripQueryDto = { page: 1, limit: 10 };
      const mockResponse = {
        items: [mockTrip],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockTripService.findUserTrips.mockResolvedValue(mockResponse);
      const mockRequest = { user: mockUser } as AuthRequest;

      const actualResult = await controller.findUserTrips(
        mockRequest,
        inputQueryDto,
      );

      expect(mockTripService.findUserTrips).toHaveBeenCalledWith(
        mockUser.id,
        inputQueryDto,
      );
      expect(actualResult).toEqual(
        ResponseUtil.success({
          trips: mockResponse.items,
          pagination: mockResponse.pagination,
        }),
      );
    });

    it('should use default pagination values', async () => {
      const inputQueryDto: TripQueryDto = {};
      const mockResponse = {
        items: [mockTrip],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockTripService.findUserTrips.mockResolvedValue(mockResponse);
      const mockRequest = { user: mockUser } as AuthRequest;

      const actualResult = await controller.findUserTrips(
        mockRequest,
        inputQueryDto,
      );

      expect(mockTripService.findUserTrips).toHaveBeenCalledWith(
        mockUser.id,
        inputQueryDto,
      );
      expect(actualResult).toEqual(
        ResponseUtil.success({
          trips: mockResponse.items,
          pagination: mockResponse.pagination,
        }),
      );
    });
  });

  describe('findTripById', () => {
    it('should return a specific trip by id', async () => {
      mockTripService.findTripById.mockResolvedValue(mockTrip);
      const mockRequest = { user: mockUser } as AuthRequest;

      const actualResult = await controller.findTripById(mockRequest, '1');

      expect(mockTripService.findTripById).toHaveBeenCalledWith(
        '1',
        mockUser.id,
      );
      expect(actualResult).toEqual(ResponseUtil.success(mockTrip));
    });

    it('should handle trip not found', async () => {
      const mockError = new NotFoundException('Trip not found');
      mockTripService.findTripById.mockRejectedValue(mockError);
      const mockRequest = { user: mockUser } as AuthRequest;

      await expect(controller.findTripById(mockRequest, '999')).rejects.toThrow(
        mockError,
      );
      expect(mockTripService.findTripById).toHaveBeenCalledWith(
        '999',
        mockUser.id,
      );
    });

    it('should handle invalid trip ID format', async () => {
      const mockRequest = { user: mockUser } as AuthRequest;
      const mockError = new BadRequestException('Invalid trip ID');
      mockTripService.findTripById.mockRejectedValue(mockError);

      await expect(
        controller.findTripById(mockRequest, 'invalid'),
      ).rejects.toThrow(mockError);
    });
  });

  describe('updateTrip', () => {
    it('should update trip successfully', async () => {
      const inputUpdateTripDto: UpdateTripDto = {
        title: 'Updated Trip',
        description: 'Updated Description',
      };
      const mockUpdatedTrip = { ...mockTrip, ...inputUpdateTripDto };

      mockTripService.updateTrip.mockResolvedValue(mockUpdatedTrip);
      const mockRequest = { user: mockUser } as AuthRequest;

      const actualResult = await controller.updateTrip(
        mockRequest,
        '1',
        inputUpdateTripDto,
      );

      expect(mockTripService.updateTrip).toHaveBeenCalledWith(
        '1',
        mockUser.id,
        inputUpdateTripDto,
      );
      expect(actualResult).toEqual(ResponseUtil.success(mockUpdatedTrip));
    });

    it('should handle service errors during trip update', async () => {
      const inputUpdateTripDto: UpdateTripDto = {
        title: 'Updated Trip',
      };
      const mockError = new ForbiddenException('Access denied');

      mockTripService.updateTrip.mockRejectedValue(mockError);
      const mockRequest = { user: mockUser } as AuthRequest;

      await expect(
        controller.updateTrip(mockRequest, '1', inputUpdateTripDto),
      ).rejects.toThrow(mockError);
    });
  });

  describe('deleteTrip', () => {
    it('should delete trip successfully', async () => {
      mockTripService.deleteTrip.mockResolvedValue(true);
      const mockRequest = { user: mockUser } as AuthRequest;

      const actualResult = await controller.deleteTrip(mockRequest, '1');

      expect(mockTripService.deleteTrip).toHaveBeenCalledWith('1', mockUser.id);
      expect(actualResult).toEqual(ResponseUtil.success({ deleted: true }));
    });

    it('should handle service errors during trip deletion', async () => {
      const mockError = new NotFoundException('Trip not found');
      mockTripService.deleteTrip.mockRejectedValue(mockError);
      const mockRequest = { user: mockUser } as AuthRequest;

      await expect(controller.deleteTrip(mockRequest, '1')).rejects.toThrow(
        mockError,
      );
    });
  });

  describe('generateShareLink', () => {
    it('should generate share link successfully', async () => {
      const inputShareTripDto: ShareTripDto = {
        expiresAt: '2025-12-31T23:59:59.000Z',
      };
      const mockSharedTrip = {
        shareToken: 'mock-share-token',
        trip: mockTrip,
        expiresAt: '2025-12-31T23:59:59.000Z',
        allowEdit: false,
      };

      mockTripService.generateShareLink.mockResolvedValue(mockSharedTrip);
      const mockRequest = { user: mockUser } as AuthRequest;

      const actualResult = await controller.generateShareLink(
        mockRequest,
        '1',
        inputShareTripDto,
      );

      expect(mockTripService.generateShareLink).toHaveBeenCalledWith(
        '1',
        mockUser.id,
        inputShareTripDto,
      );
      expect(actualResult).toEqual(
        ResponseUtil.success(mockSharedTrip, HttpStatus.CREATED),
      );
    });
  });

  describe('duplicateTrip', () => {
    it('should duplicate trip successfully', async () => {
      const mockDuplicatedTrip = {
        ...mockTrip,
        id: '2',
        title: 'Copy of Test Trip',
      };

      mockTripService.duplicateTrip.mockResolvedValue(mockDuplicatedTrip);
      const mockRequest = { user: mockUser } as AuthRequest;

      const actualResult = await controller.duplicateTrip(mockRequest, '1');

      expect(mockTripService.duplicateTrip).toHaveBeenCalledWith(
        '1',
        mockUser.id,
      );
      expect(actualResult).toEqual(
        ResponseUtil.success(mockDuplicatedTrip, HttpStatus.CREATED),
      );
    });
  });

  describe('searchTripsByQuery', () => {
    it('should search trips successfully', async () => {
      const inputSearchDto: TripSearchDto = {
        query: 'Paris',
        page: 1,
        limit: 10,
      };
      const mockSearchResults = {
        items: [mockTrip],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockTripService.searchTripsByQuery.mockResolvedValue(mockSearchResults);
      const mockRequest = { user: mockUser } as AuthRequest;

      const actualResult = await controller.searchTripsByQuery(
        mockRequest,
        inputSearchDto,
      );

      expect(mockTripService.searchTripsByQuery).toHaveBeenCalledWith(
        mockUser.id,
        inputSearchDto,
      );
      expect(actualResult).toEqual(
        ResponseUtil.success({
          trips: mockSearchResults.items,
          pagination: mockSearchResults.pagination,
        }),
      );
    });
  });

  describe('adminTest', () => {
    it('should return admin test response', () => {
      const result = controller.adminTest();
      expect(result.result).toBe('OK');
      expect(result.data).toHaveProperty('message');
      expect(result.data).toHaveProperty('timestamp');
    });
  });
});

describe('PublicTripController', () => {
  let publicController: PublicTripController;

  const mockTrip = {
    id: '1',
    title: 'Test Trip',
    description: 'Test Description',
    destinationName: 'Paris',
    startDate: '2025-07-01',
    endDate: '2025-07-07',
    status: TripStatus.PLANNING,
    userId: '1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTripService = {
    findSharedTripByToken: jest.fn(),
  };

  const mockCountryDefaultsService = {
    getCountryDefaults: jest.fn(),
    getDefaultCurrency: jest.fn(),
    getDefaultTimezone: jest.fn(),
    getDefaultLanguage: jest.fn(),
    applyCountryDefaults: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicTripController],
      providers: [
        {
          provide: TripService,
          useValue: mockTripService,
        },
        {
          provide: CountryDefaultsService,
          useValue: mockCountryDefaultsService,
        },
      ],
    }).compile();

    publicController = module.get<PublicTripController>(PublicTripController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findSharedTripByToken', () => {
    it('should return shared trip successfully', async () => {
      const shareToken = 'valid-share-token';
      const mockSharedTripData = {
        trip: mockTrip,
        shareInfo: {
          shareToken,
          allowEdit: false,
          expiresAt: '2025-12-31T23:59:59.000Z',
        },
      };

      mockTripService.findSharedTripByToken.mockResolvedValue(
        mockSharedTripData,
      );

      const actualResult =
        await publicController.findSharedTripByToken(shareToken);

      expect(mockTripService.findSharedTripByToken).toHaveBeenCalledWith(
        shareToken,
      );
      expect(actualResult).toEqual(ResponseUtil.success(mockSharedTripData));
    });

    it('should handle invalid share token', async () => {
      const shareToken = 'invalid-token';
      const mockError = new NotFoundException('Shared trip not found');

      mockTripService.findSharedTripByToken.mockRejectedValue(mockError);

      await expect(
        publicController.findSharedTripByToken(shareToken),
      ).rejects.toThrow(mockError);
    });
  });

  describe('getCountryDefaults', () => {
    it('should return country defaults successfully', () => {
      const countryCode = 'JP';
      const mockDefaults = {
        countryCode: 'JP',
        currency: 'JPY',
        timezone: 'Asia/Tokyo',
        language: 'ja',
      };

      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(
        mockDefaults,
      );

      const actualResult = publicController.getCountryDefaults(countryCode);

      expect(
        mockCountryDefaultsService.getCountryDefaults,
      ).toHaveBeenCalledWith('JP');
      expect(actualResult).toEqual(ResponseUtil.success(mockDefaults));
    });

    it('should handle country code in lowercase', () => {
      const countryCode = 'us';
      const mockDefaults = {
        countryCode: 'US',
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en',
      };

      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(
        mockDefaults,
      );

      const actualResult = publicController.getCountryDefaults(countryCode);

      expect(
        mockCountryDefaultsService.getCountryDefaults,
      ).toHaveBeenCalledWith('US');
      expect(actualResult).toEqual(ResponseUtil.success(mockDefaults));
    });

    it('should handle unsupported country code', () => {
      const countryCode = 'XX';

      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(null);

      const actualResult = publicController.getCountryDefaults(countryCode);

      expect(
        mockCountryDefaultsService.getCountryDefaults,
      ).toHaveBeenCalledWith('XX');
      expect(actualResult).toEqual(ResponseUtil.success(null));
    });
  });
});
