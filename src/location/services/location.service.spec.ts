import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { LocationService } from './location.service';
import { GoongApiService } from './goong-api.service';
import { NominatimApiService } from './nominatim-api.service';
import { CacheService } from '../../shared/services/cache.service';
import { APIThrottleService } from '../../shared/services/api-throttle.service';
import { VietnamLocationEntity } from '../../schemas/vietnam-location.entity';
import { DestinationEntity } from '../../schemas/destination.entity';
import { LocationSearchDto, POISearchDto } from '../dto/location.dto';
import { POICategory } from '../dto/poi-search.dto';
import { LocationSource } from '../interfaces/smart-location.interface';

describe('LocationService', () => {
  let service: LocationService;
  let mockGoongApiService: jest.Mocked<GoongApiService>;
  let mockNominatimApiService: jest.Mocked<NominatimApiService>;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockApiThrottleService: jest.Mocked<APIThrottleService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockVietnamLocationRepository: any;
  let mockDestinationRepository: any;

  beforeEach(async () => {
    // Create mock repositories
    mockVietnamLocationRepository = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockDestinationRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    // Create mock services
    mockGoongApiService = {
      searchPlaces: jest.fn(),
      searchPOI: jest.fn(),
      isAvailable: jest.fn(),
      extractProvince: jest.fn(),
      extractDistrict: jest.fn(),
      extractWard: jest.fn(),
    } as any;

    mockNominatimApiService = {
      searchPlaces: jest.fn(),
      searchPOI: jest.fn(),
      isAvailable: jest.fn(),
    } as any;

    mockCacheService = {
      getSearchResults: jest.fn(),
      setSearchResults: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as any;

    mockApiThrottleService = {
      checkAndLog: jest.fn(),
    } as any;

    mockConfigService = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: GoongApiService,
          useValue: mockGoongApiService,
        },
        {
          provide: NominatimApiService,
          useValue: mockNominatimApiService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: APIThrottleService,
          useValue: mockApiThrottleService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(VietnamLocationEntity),
          useValue: mockVietnamLocationRepository,
        },
        {
          provide: getRepositoryToken(DestinationEntity),
          useValue: mockDestinationRepository,
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);

    // Setup default mock behaviors
    mockCacheService.getSearchResults.mockReturnValue(null);
    mockCacheService.get.mockReturnValue(null);
    mockDestinationRepository.findOne.mockResolvedValue(null);
    mockGoongApiService.searchPlaces.mockResolvedValue([]);
    mockNominatimApiService.searchPlaces.mockResolvedValue([]);
    mockApiThrottleService.checkAndLog.mockReturnValue(true);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchLocation', () => {
    const searchDto: LocationSearchDto = {
      query: 'Ho Chi Minh City',
      userCountry: 'VN',
      limit: 5,
    };

    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();

      // Ensure default return values for each test
      mockCacheService.getSearchResults.mockReturnValue(null);
      mockDestinationRepository.findOne.mockResolvedValue(null);
      mockGoongApiService.searchPlaces.mockResolvedValue([]);
      mockNominatimApiService.searchPlaces.mockResolvedValue([]);
      mockApiThrottleService.checkAndLog.mockReturnValue(true);
      mockGoongApiService.isAvailable.mockReturnValue(true);
    });

    it('should return cached result if search results exist in cache', async () => {
      // Arrange - Mock cache service to return cached SmartLocation results
      const cachedSmartLocations = [
        {
          id: 'cache_hcm_001',
          name: 'Ho Chi Minh City',
          displayName: 'Ho Chi Minh City, Vietnam',
          coordinates: {
            lat: 10.8231,
            lng: 106.6297,
          },
          country: 'Vietnam',
          countryCode: 'VN',
          address: 'Ho Chi Minh City, Vietnam',
          placeType: 'city',
          source: LocationSource.CACHE,
          importance: 0.9,
        },
      ];

      mockCacheService.getSearchResults.mockReturnValue(cachedSmartLocations);

      // Act
      const result = await service.searchLocation(searchDto);

      // Assert
      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Ho Chi Minh City');
      expect(result.results[0].source).toBe('cache');
      expect(result.metadata.cache.hit).toBe(true);
      expect(mockCacheService.getSearchResults).toHaveBeenCalled();
      // Should not call API services for cache hits
      expect(mockGoongApiService.searchPlaces).not.toHaveBeenCalled();
      expect(mockNominatimApiService.searchPlaces).not.toHaveBeenCalled();
    });

    it('should search Vietnam locations first for VN country code', async () => {
      // Arrange
      const vietnamLocations = [
        {
          id: '1',
          name: 'Ho Chi Minh City',
          nameEn: 'Ho Chi Minh City',
          fullName: 'Thành phố Hồ Chí Minh',
          fullNameEn: 'Ho Chi Minh City',
          codeName: 'ho_chi_minh',
          administrativeUnitId: 1,
          level: 'province',
          latitude: 10.8231,
          longitude: 106.6297,
          createdAt: new Date(),
          updatedAt: new Date(),
          provinceId: 79,
          provinceName: 'Ho Chi Minh City',
          districtName: null,
          districtId: null,
          wardId: null,
          coordinates: 'POINT(106.6297 10.8231)',
        },
      ];

      mockDestinationRepository.findOne.mockResolvedValue(null);

      // Mock the query builder chain properly
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(vietnamLocations),
      };

      mockVietnamLocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Act
      const result = await service.searchLocation(searchDto);

      // Assert
      expect(result.results).toHaveLength(1);
      expect(result.results[0].source).toBe('database');
      expect(result.metadata.cache.hit).toBe(false);
      expect(
        mockVietnamLocationRepository.createQueryBuilder,
      ).toHaveBeenCalled();
    });

    it('should use Goong API for Vietnam locations when not in database', async () => {
      // Arrange
      // Reset all mocks to ensure clean state
      jest.clearAllMocks();

      mockCacheService.getSearchResults.mockReturnValue(null);
      mockDestinationRepository.findOne.mockResolvedValue(null);

      // Mock empty Vietnamese location results
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // Empty database results
      };

      mockVietnamLocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Mock Goong API to return GoongPlace results
      const mockGoongPlace = {
        place_id: 'goong_123',
        name: 'Ho Chi Minh City',
        formatted_address: 'Ho Chi Minh City, Vietnam',
        geometry: {
          location: {
            lat: 10.8231,
            lng: 106.6297,
          },
        },
        compound: {
          province: 'Ho Chi Minh',
          district: 'District 1',
        },
        types: ['locality'],
        address_components: [
          {
            long_name: 'Ho Chi Minh City',
            short_name: 'HCMC',
            types: ['locality', 'political'],
          },
        ],
      };

      // Ensure Goong API is available and returns results
      mockGoongApiService.isAvailable.mockReturnValue(true);
      mockGoongApiService.searchPlaces.mockResolvedValue([mockGoongPlace]);
      mockGoongApiService.extractProvince.mockReturnValue('Ho Chi Minh');
      mockGoongApiService.extractDistrict.mockReturnValue('District 1');
      mockGoongApiService.extractWard.mockReturnValue('Ward 1');

      mockApiThrottleService.checkAndLog.mockReturnValue(true);

      // Act
      const result = await service.searchLocation(searchDto);

      // Debug: Log the actual result to see what's happening
      console.log('Test Debug - Result:', JSON.stringify(result, null, 2));
      console.log(
        'Test Debug - Goong API called:',
        mockGoongApiService.searchPlaces.mock.calls,
      );

      // Assert
      expect(mockGoongApiService.isAvailable).toHaveBeenCalled();
      expect(mockGoongApiService.searchPlaces).toHaveBeenCalledWith(
        'Ho Chi Minh City',
        { limit: 5 },
      );
      expect(result.results).toHaveLength(1);
      expect(result.results[0].source).toBe('goong');
      expect(result.results[0].name).toBe('Ho Chi Minh City');
    });

    it('should fallback to Nominatim API when Goong fails', async () => {
      // Arrange
      mockDestinationRepository.findOne.mockResolvedValue(null);

      // Mock empty Vietnamese location results
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockVietnamLocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Mock Goong API to fail
      mockGoongApiService.searchPlaces.mockRejectedValue(
        new Error('Goong API failed'),
      );

      // Mock Nominatim API to succeed with SmartLocation format
      const mockSmartLocation = {
        id: 'nominatim_123456',
        name: 'Ho Chi Minh City',
        displayName: 'Ho Chi Minh City, Vietnam',
        coordinates: {
          lat: 10.8231,
          lng: 106.6297,
        },
        country: 'Vietnam',
        countryCode: 'VN',
        address: 'Ho Chi Minh City, Vietnam',
        placeType: 'city',
        source: LocationSource.NOMINATIM,
        importance: 0.8,
      };

      mockNominatimApiService.searchPlaces.mockResolvedValue([
        mockSmartLocation,
      ]);

      // Act
      const result = await service.searchLocation(searchDto);

      // Assert
      expect(result.results).toHaveLength(1);
      expect(result.results[0].source).toBe('nominatim');
      expect(result.results[0].name).toBe('Ho Chi Minh City');
      expect(mockGoongApiService.searchPlaces).toHaveBeenCalled();
      expect(mockNominatimApiService.searchPlaces).toHaveBeenCalled();
    });

    it('should return empty results when API throttle limit is exceeded', async () => {
      // Arrange
      mockDestinationRepository.findOne.mockResolvedValue(null);

      // Mock empty Vietnamese location results
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockVietnamLocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      mockApiThrottleService.checkAndLog.mockReturnValue(false);

      // Act
      const result = await service.searchLocation(searchDto);

      // Assert
      expect(result.results).toEqual([]);
      expect(result.metadata.cache.hit).toBe(false);
    });

    it('should handle empty search results gracefully', async () => {
      // Arrange
      mockDestinationRepository.findOne.mockResolvedValue(null);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockVietnamLocationRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      mockGoongApiService.searchPlaces.mockResolvedValue([]);
      mockNominatimApiService.searchPlaces.mockResolvedValue([]);

      // Act
      const result = await service.searchLocation(searchDto);

      // Assert
      expect(result.results).toEqual([]);
      expect(result.metadata.cache.hit).toBe(false);
    });
  });

  describe('searchPOI', () => {
    const poiSearchDto: POISearchDto = {
      lat: 10.8231,
      lng: 106.6297,
      radius: 1000,
      category: POICategory.ATTRACTIONS,
      limit: 10,
    };

    it('should search POI using service API', async () => {
      // Arrange
      // Mock the Goong API service to return valid results
      mockGoongApiService.searchPlaces.mockResolvedValue([
        {
          place_id: 'goong_123',
          name: 'Independence Palace',
          formatted_address:
            '135 Nam Ky Khoi Nghia, District 1, Ho Chi Minh City',
          geometry: {
            location: { lat: 10.8268, lng: 106.6951 },
          },
          types: ['tourist_attraction'],
          address_components: [
            {
              long_name: 'Independence Palace',
              short_name: 'Independence Palace',
              types: ['establishment', 'point_of_interest'],
            },
          ],
        },
      ]);
      mockGoongApiService.isAvailable.mockReturnValue(true);

      // Act
      const result = await service.searchPOI(poiSearchDto);

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Independence Palace');
      expect(mockGoongApiService.searchPlaces).toHaveBeenCalled();
    });

    it('should handle POI search API failures gracefully', async () => {
      // Arrange
      mockGoongApiService.searchPlaces.mockRejectedValue(
        new Error('Goong API failed'),
      );
      mockNominatimApiService.searchPOI.mockResolvedValue([]);

      // Act
      const result = await service.searchPOI(poiSearchDto);

      // Assert
      expect(result).toEqual({
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    });
  });
});
