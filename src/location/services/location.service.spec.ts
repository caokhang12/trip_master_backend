import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IsNull } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import axios from 'axios';

import { LocationService } from '../services/location.service';
import { DestinationEntity } from '../entities/destination.entity';
import { VietnamLocationEntity } from '../entities/vietnam-location.entity';
import { APIThrottleService } from '../../shared/services/api-throttle.service';
import { LocationSearchDto } from '../dto/location-search.dto';
import { POISearchDto, POICategory } from '../dto/poi-search.dto';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LocationService', () => {
  let service: LocationService;

  const mockDestinationRepository = {
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockReturnValue({}),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockVietnamLocationRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockApiThrottleService = {
    checkAndLog: jest.fn().mockReturnValue(true),
    getUsageStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: getRepositoryToken(DestinationEntity),
          useValue: mockDestinationRepository,
        },
        {
          provide: getRepositoryToken(VietnamLocationEntity),
          useValue: mockVietnamLocationRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: APIThrottleService,
          useValue: mockApiThrottleService,
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);

    // Setup default config values
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        GOONG_API_KEY: 'test-goong-key',
        GEOAPIFY_API_KEY: 'test-geoapify-key',
      };
      return config[key];
    });

    // Setup default API throttle service responses
    mockApiThrottleService.checkAndLog.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchLocation', () => {
    const searchDto: LocationSearchDto = {
      query: 'Ho Chi Minh City',
      country: 'VN',
      limit: 5,
    };

    it('should return cached result if destination exists in database', async () => {
      // Arrange
      const cachedDestination = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Ho Chi Minh City',
        country: 'Vietnam',
        countryCode: 'VN',
        city: 'Ho Chi Minh City',
        province: 'Ho Chi Minh',
        coordinates: 'POINT(106.6297 10.8231)', // PostGIS format
        description: 'Largest city in Vietnam',
        imageUrls: [],
        averageBudget: null,
        bestTimeToVisit: null,
        poiData: null,
        weatherInfo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Ensure API throttle allows request
      mockApiThrottleService.checkAndLog.mockReturnValue(true);
      mockDestinationRepository.findOne.mockResolvedValue(cachedDestination);

      // Act
      const result = await service.searchLocation(
        searchDto.query,
        searchDto.country,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Ho Chi Minh City');
      expect(result[0].source).toBe('destination-cache');
      expect(mockDestinationRepository.findOne).toHaveBeenCalled();
      expect(mockedAxios.get).not.toHaveBeenCalled();
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
      const result = await service.searchLocation(
        searchDto.query,
        searchDto.country,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('vietnam-db');
      expect(
        mockVietnamLocationRepository.createQueryBuilder,
      ).toHaveBeenCalled();
    });

    it('should use Goong API for Vietnam locations when not in database', async () => {
      // Arrange
      const goongResponse = {
        data: {
          results: [
            {
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
            },
          ],
        },
      };

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

      mockedAxios.get.mockResolvedValue(goongResponse);

      // Act
      const result = await service.searchLocation(
        searchDto.query,
        searchDto.country,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('goong');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('goong.io'),
        expect.any(Object),
      );
    });

    it('should fallback to Nominatim API when Goong fails', async () => {
      // Arrange
      const nominatimResponse = {
        data: [
          {
            display_name: 'Ho Chi Minh City, Vietnam',
            lat: '10.8231',
            lon: '106.6297',
            class: 'place',
            type: 'city',
            importance: 0.8,
            address: {
              city: 'Ho Chi Minh City',
              country: 'Vietnam',
              country_code: 'vn',
            },
          },
        ],
      };

      mockDestinationRepository.findOne.mockResolvedValue(null);
      mockVietnamLocationRepository.find.mockResolvedValue([]);
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Goong API failed'))
        .mockResolvedValue(nominatimResponse);
      mockDestinationRepository.save.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Ho Chi Minh City',
        country: 'Vietnam',
        countryCode: 'VN',
        latitude: 10.8231,
        longitude: 106.6297,
        type: 'city',
        population: null,
        timezone: null,
        poiData: [],
        weatherInfo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await service.searchLocation(
        searchDto.query,
        searchDto.country,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('nominatim');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
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
      const result = await service.searchLocation(
        searchDto.query,
        searchDto.country,
      );

      // Assert
      expect(result).toEqual([]);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should handle empty search results gracefully', async () => {
      // Arrange
      mockDestinationRepository.findOne.mockResolvedValue(null);
      mockVietnamLocationRepository.find.mockResolvedValue([]);
      mockedAxios.get.mockResolvedValue({ data: { predictions: [] } });

      // Act
      const result = await service.searchLocation(
        searchDto.query,
        searchDto.country,
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findNearbyPlaces', () => {
    const poiSearchDto: POISearchDto = {
      lat: 10.8231,
      lng: 106.6297,
      radius: 1000,
      category: POICategory.ATTRACTIONS,
      limit: 10,
    };

    it('should search POI using Geoapify API', async () => {
      // Arrange
      const geoapifyResponse = {
        data: {
          features: [
            {
              properties: {
                name: 'Independence Palace',
                categories: ['tourism.attraction'],
                address_line1: '135 Nam Ky Khoi Nghia',
                address_line2: 'District 1, Ho Chi Minh City',
                country: 'Vietnam',
                country_code: 'vn',
                formatted:
                  '135 Nam Ky Khoi Nghia, District 1, Ho Chi Minh City, Vietnam',
                place_id: 'test-place-id',
              },
              geometry: {
                type: 'Point',
                coordinates: [106.6951, 10.8268], // [lng, lat] format
              },
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(geoapifyResponse);

      // Act
      const result = await service.findNearbyPlaces(
        poiSearchDto.lat,
        poiSearchDto.lng,
        poiSearchDto.category || 'all',
        poiSearchDto.radius,
        poiSearchDto.limit,
      );

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Independence Palace');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.geoapify.com/v2/places',
        expect.objectContaining({
          params: expect.objectContaining({
            categories: 'tourism',
            filter: `circle:${poiSearchDto.lng},${poiSearchDto.lat},${poiSearchDto.radius}`,
            limit: poiSearchDto.limit,
          }),
        }),
      );
    });

    it('should handle POI search API failures gracefully', async () => {
      // Arrange
      mockedAxios.get.mockRejectedValue(new Error('Geoapify API failed'));

      // Act
      const result = await service.findNearbyPlaces(
        poiSearchDto.lat,
        poiSearchDto.lng,
        poiSearchDto.category || 'all',
        poiSearchDto.radius,
        poiSearchDto.limit,
      );

      // Assert
      expect(result).toEqual({
        items: [],
        pagination: {
          page: 1,
          limit: poiSearchDto.limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      });
    });

    it('should apply category filters correctly', async () => {
      // Arrange
      const categorizedPoiDto: POISearchDto = {
        ...poiSearchDto,
        category: POICategory.RESTAURANTS,
      };

      const geoapifyResponse = {
        data: {
          features: [
            {
              properties: {
                name: 'Test Restaurant',
                categories: ['catering.restaurant'],
                formatted: 'Test Restaurant, Ho Chi Minh City',
                place_id: 'restaurant-id',
              },
              geometry: {
                type: 'Point',
                coordinates: [106.6951, 10.8268], // [lng, lat] format
              },
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(geoapifyResponse);

      // Act
      const result = await service.findNearbyPlaces(
        categorizedPoiDto.lat,
        categorizedPoiDto.lng,
        categorizedPoiDto.category || 'all',
        categorizedPoiDto.radius,
        categorizedPoiDto.limit,
      );

      // Assert
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.geoapify.com/v2/places',
        expect.objectContaining({
          params: expect.objectContaining({
            categories: 'catering',
            filter: `circle:${categorizedPoiDto.lng},${categorizedPoiDto.lat},${categorizedPoiDto.radius}`,
          }),
        }),
      );
      expect(result.items[0].name).toBe('Test Restaurant');
    });

    it('should respect radius parameter', async () => {
      // Arrange
      const radiusDto: POISearchDto = {
        ...poiSearchDto,
        radius: 500,
      };

      mockedAxios.get.mockResolvedValue({ data: { features: [] } });

      // Act
      await service.findNearbyPlaces(
        radiusDto.lat,
        radiusDto.lng,
        radiusDto.category || 'all',
        radiusDto.radius,
        radiusDto.limit,
      );

      // Assert
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.geoapify.com/v2/places',
        expect.objectContaining({
          params: expect.objectContaining({
            filter: `circle:${radiusDto.lng},${radiusDto.lat},${radiusDto.radius}`,
          }),
        }),
      );
    });

    it('should handle API throttle limits for POI search', async () => {
      // Arrange - Mock both Geoapify throttle (false) and Nominatim failure
      mockApiThrottleService.checkAndLog.mockReturnValue(false);
      mockedAxios.get.mockRejectedValue(new Error('Nominatim API failed'));

      // Act
      const result = await service.findNearbyPlaces(
        poiSearchDto.lat,
        poiSearchDto.lng,
        poiSearchDto.category || 'all',
        poiSearchDto.radius,
        poiSearchDto.limit,
      );

      // Assert - Should return empty results when APIs are throttled/failed
      expect(result.items).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getVietnameseRegions', () => {
    it('should provide Vietnam-specific location suggestions', async () => {
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
          districtId: null,
          wardId: null,
        },
        {
          id: '2',
          name: 'Hanoi',
          nameEn: 'Hanoi',
          fullName: 'Thành phố Hà Nội',
          fullNameEn: 'Hanoi',
          codeName: 'ha_noi',
          administrativeUnitId: 1,
          level: 'province',
          latitude: 21.0285,
          longitude: 105.8542,
          createdAt: new Date(),
          updatedAt: new Date(),
          provinceId: 1,
          provinceName: 'Hanoi',
          districtId: null,
          wardId: null,
        },
      ];

      mockVietnamLocationRepository.find.mockResolvedValue(vietnamLocations);

      // Act
      const result = await service.getVietnameseRegions();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Ho Chi Minh City');
      expect(result[1].name).toBe('Hanoi');
      expect(mockVietnamLocationRepository.find).toHaveBeenCalledWith({
        where: { districtId: IsNull(), wardId: IsNull() },
        order: { provinceName: 'ASC' },
      });
    });

    it('should handle API fallback when database is empty', async () => {
      // Arrange
      mockVietnamLocationRepository.find.mockResolvedValue([]);
      const apiResponse = [
        {
          id: 79,
          name: 'Thành phố Hồ Chí Minh',
          slug: 'thanh-pho-ho-chi-minh',
          type: 'thanh-pho',
          name_with_type: 'Thành phố Hồ Chí Minh',
          code: '79',
        },
      ];

      mockedAxios.get.mockResolvedValue({ data: apiResponse });

      // Act
      const result = await service.getVietnameseRegions();

      // Assert
      expect(result).toHaveLength(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://provinces.open-api.vn/api/p/',
      );
    });
  });
});
