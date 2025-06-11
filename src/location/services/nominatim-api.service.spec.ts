import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

import { NominatimApiService } from './nominatim-api.service';
import { APIThrottleService } from '../../shared/services/api-throttle.service';
import { CacheService } from '../../shared/services/cache.service';
import {
  SmartLocation,
  LocationSource,
} from '../interfaces/smart-location.interface';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NominatimApiService', () => {
  let service: NominatimApiService;
  let configService: ConfigService;
  let apiThrottleService: APIThrottleService;
  let cacheService: CacheService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockApiThrottleService = {
    checkAndLog: jest.fn().mockReturnValue(true),
    getUsageStats: jest.fn(),
    reset: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    getSearchResults: jest.fn(),
    setSearchResults: jest.fn(),
    generateCacheKey: jest.fn(),
    getCachedApiResponse: jest.fn(),
    setCachedApiResponse: jest.fn(),
    cacheApiResponse: jest.fn(),
    getCachedReverseGeocode: jest.fn(),
    cacheReverseGeocode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NominatimApiService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: APIThrottleService,
          useValue: mockApiThrottleService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<NominatimApiService>(NominatimApiService);
    configService = module.get<ConfigService>(ConfigService);
    apiThrottleService = module.get<APIThrottleService>(APIThrottleService);
    cacheService = module.get<CacheService>(CacheService);

    // Setup default config mock
    mockConfigService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'NOMINATIM_BASE_URL':
          return 'https://nominatim.openstreetmap.org';
        default:
          return undefined;
      }
    });

    // Reset throttle service to allow API calls
    mockApiThrottleService.checkAndLog.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchPlaces', () => {
    it('should search international places and return SmartLocation array', async () => {
      // Arrange
      const query = 'Eiffel Tower';
      const options = {
        countryCode: 'fr',
        limit: 5,
        language: 'en',
      };

      const mockNominatimResponse = {
        data: [
          {
            place_id: 27997739,
            licence:
              'Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright',
            osm_type: 'way',
            osm_id: 27997739,
            boundingbox: ['48.8583701', '48.8584114', '2.2944813', '2.2945043'],
            lat: '48.8583701',
            lon: '2.2944813',
            display_name:
              'Tour Eiffel, Avenue Gustave Eiffel, Gros-Caillou, 7e, Paris, Île-de-France, Metropolitan France, 75007, France',
            class: 'tourism',
            type: 'attraction',
            importance: 0.8960608532461685,
            icon: 'https://nominatim.openstreetmap.org/ui/mapicons/poi_point_of_interest.p.20.png',
            address: {
              attraction: 'Tour Eiffel',
              road: 'Avenue Gustave Eiffel',
              neighbourhood: 'Gros-Caillou',
              suburb: '7e',
              city: 'Paris',
              state: 'Île-de-France',
              postcode: '75007',
              country: 'France',
              country_code: 'fr',
            },
          },
        ],
      };

      const expectedSmartLocation: SmartLocation = {
        id: 'nominatim_27997739',
        name: 'Tour Eiffel',
        displayName:
          'Tour Eiffel, Avenue Gustave Eiffel, Gros-Caillou, 7e, Paris, Île-de-France, Metropolitan France, 75007, France',
        coordinates: { lat: 48.8583701, lng: 2.2944813 },
        country: 'France',
        countryCode: 'FR',
        address:
          'Tour Eiffel, Avenue Gustave Eiffel, Gros-Caillou, 7e, Paris, Île-de-France, Metropolitan France, 75007, France',
        placeType: 'attraction',
        source: LocationSource.NOMINATIM,
        importance: 0.8960608532461685,
        metadata: {
          osm_id: 27997739,
          osm_type: 'way',
          class: 'tourism',
          type: 'attraction',
        },
      };

      mockCacheService.get.mockReturnValue(null);
      mockedAxios.get.mockResolvedValue(mockNominatimResponse);

      // Act
      const result = await service.searchPlaces(query, options);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'nominatim_27997739',
        name: 'Tour Eiffel',
        source: LocationSource.NOMINATIM,
        country: 'France',
        countryCode: 'FR',
        coordinates: { lat: 48.8583701, lng: 2.2944813 },
      });
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/search'),
        expect.objectContaining({
          params: expect.objectContaining({
            q: query,
            countrycodes: options.countryCode,
            limit: options.limit,
            format: 'json',
            addressdetails: 1,
            extratags: 1,
            namedetails: 1,
          }),
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('TripMaster'),
          }),
        }),
      );
    });

    it('should return cached results when available', async () => {
      // Arrange
      const query = 'Paris';
      const cachedResults = [
        {
          id: 'cached_001',
          name: 'Paris',
          source: LocationSource.NOMINATIM,
        },
      ];

      mockCacheService.get.mockReturnValue(cachedResults);

      // Act
      const result = await service.searchPlaces(query);

      // Assert
      expect(result).toEqual(cachedResults);
      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringContaining('nominatim_search_'),
      );
    });

    it('should handle API rate limiting', async () => {
      // Arrange
      const query = 'test query';
      mockApiThrottleService.checkAndLog.mockReturnValue(false);

      // Act & Assert
      await expect(service.searchPlaces(query)).rejects.toThrow(
        new HttpException(
          'Nominatim API rate limit exceeded',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const query = 'test query';
      const apiError = {
        response: {
          status: 400,
          data: { error: 'Invalid request' },
        },
        message: 'Request failed',
      };

      mockCacheService.get.mockReturnValue(null);
      mockedAxios.get.mockRejectedValue(apiError);

      // Act & Assert
      await expect(service.searchPlaces(query)).rejects.toThrow(HttpException);
    });

    it('should filter results by bounding box', async () => {
      // Arrange
      const query = 'restaurant';
      const options = {
        viewbox: '2.2,48.9,2.4,48.8', // west,north,east,south format
      };

      const mockResponse = {
        data: [
          {
            place_id: 123456,
            lat: '48.85',
            lon: '2.35',
            display_name: 'Restaurant Test, Paris, France',
            type: 'restaurant',
            class: 'amenity',
          },
        ],
      };

      mockCacheService.get.mockReturnValue(null);
      mockedAxios.get.mockResolvedValue(mockResponse);

      // Act
      const result = await service.searchPlaces(query, options);

      // Assert
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            viewbox: '2.2,48.9,2.4,48.8',
            bounded: 1,
          }),
        }),
      );
    });
  });

  describe('getPlaceDetails', () => {
    it('should get place details and return SmartLocation', async () => {
      // Arrange
      const osmType = 'way';
      const osmId = 27997739;
      const mockDetailsResponse = {
        data: {
          place_id: 27997739,
          licence:
            'Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright',
          osm_type: 'way',
          osm_id: 27997739,
          lat: '48.8583701',
          lon: '2.2944813',
          display_name:
            'Tour Eiffel, Avenue Gustave Eiffel, Gros-Caillou, 7e, Paris, Île-de-France, Metropolitan France, 75007, France',
          class: 'tourism',
          type: 'attraction',
          importance: 0.8960608532461685,
          address: {
            attraction: 'Tour Eiffel',
            road: 'Avenue Gustave Eiffel',
            city: 'Paris',
            country: 'France',
            country_code: 'fr',
          },
          extratags: {
            website: 'https://www.toureiffel.paris',
            height: '330',
            architect: 'Gustave Eiffel',
          },
        },
      };

      mockCacheService.get.mockReturnValue(null);
      mockedAxios.get.mockResolvedValue(mockDetailsResponse);

      // Act
      const result = await service.getPlaceDetails(osmId);

      // Assert
      expect(result).toMatchObject({
        id: `nominatim_${osmId}`,
        name: 'Tour Eiffel',
        coordinates: { lat: 48.8583701, lng: 2.2944813 },
        source: LocationSource.NOMINATIM,
        metadata: expect.objectContaining({
          osm_id: osmId,
          osm_type: osmType,
          website: 'https://www.toureiffel.paris',
          height: '330',
          architect: 'Gustave Eiffel',
        }),
      });
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/details'),
        expect.objectContaining({
          params: expect.objectContaining({
            osmtype: osmType.charAt(0).toUpperCase(),
            osmid: osmId,
            format: 'json',
            addressdetails: 1,
            extratags: 1,
            namedetails: 1,
          }),
        }),
      );
    });

    it('should return null for invalid OSM ID', async () => {
      // Arrange
      const osmType = 'way';
      const invalidOsmId = -1;
      const errorResponse = {
        response: {
          status: 404,
          data: { error: 'OSM object not found' },
        },
      };

      mockCacheService.get.mockReturnValue(null);
      mockedAxios.get.mockRejectedValue(errorResponse);

      // Act
      const result = await service.getPlaceDetails(invalidOsmId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('reverseGeocode', () => {
    it('should reverse geocode coordinates and return SmartLocation', async () => {
      // Arrange
      const coordinates = { lat: 48.8584, lng: 2.2945 };
      const language = 'en';
      const mockReverseResponse = {
        data: {
          place_id: 27997739,
          licence:
            'Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright',
          osm_type: 'way',
          osm_id: 27997739,
          lat: '48.8583701',
          lon: '2.2944813',
          display_name:
            'Tour Eiffel, Avenue Gustave Eiffel, Gros-Caillou, 7e, Paris, Île-de-France, Metropolitan France, 75007, France',
          address: {
            attraction: 'Tour Eiffel',
            road: 'Avenue Gustave Eiffel',
            neighbourhood: 'Gros-Caillou',
            suburb: '7e',
            city: 'Paris',
            state: 'Île-de-France',
            postcode: '75007',
            country: 'France',
            country_code: 'fr',
          },
          boundingbox: ['48.8583701', '48.8584114', '2.2944813', '2.2945043'],
        },
      };

      mockCacheService.get.mockReturnValue(null);
      mockedAxios.get.mockResolvedValue(mockReverseResponse);

      // Act
      const result = await service.reverseGeocode(
        coordinates.lat,
        coordinates.lng,
        { language },
      );

      // Assert
      expect(result).toMatchObject({
        coordinates: { lat: 48.8583701, lng: 2.2944813 },
        name: 'Tour Eiffel',
        country: 'France',
        countryCode: 'FR',
        source: LocationSource.NOMINATIM,
        administrative: expect.objectContaining({
          country: 'France',
          state: 'Île-de-France',
          city: 'Paris',
          suburb: '7e',
          neighbourhood: 'Gros-Caillou',
          road: 'Avenue Gustave Eiffel',
        }),
      });
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/reverse'),
        expect.objectContaining({
          params: expect.objectContaining({
            lat: coordinates.lat,
            lon: coordinates.lng,
            'accept-language': language,
            format: 'json',
            addressdetails: 1,
            extratags: 1,
            namedetails: 1,
          }),
        }),
      );
    });

    it('should handle coordinates with no results', async () => {
      // Arrange
      const coordinates = { lat: 0, lng: 0 }; // Middle of ocean
      const mockEmptyResponse = {
        data: { error: 'Unable to geocode' },
      };

      mockCacheService.get.mockReturnValue(null);
      mockedAxios.get.mockResolvedValue(mockEmptyResponse);

      // Act
      const result = await service.reverseGeocode(
        coordinates.lat,
        coordinates.lng,
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should include zoom level in reverse geocoding', async () => {
      // Arrange
      const coordinates = { lat: 48.8584, lng: 2.2945 };
      const zoom = 18; // Street level detail

      // Act
      await service.reverseGeocode(coordinates.lat, coordinates.lng, { zoom });

      // Assert
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            zoom,
          }),
        }),
      );
    });
  });

  describe('buildSearchParams', () => {
    it('should build correct search parameters', async () => {
      // Arrange

      const query = 'test query';
      const options = {
        countryCode: 'fr',
        limit: 10,
        language: 'en',
        types: 'tourism',
        boundingBox: {
          minLat: 48.8,
          minLng: 2.2,
          maxLat: 48.9,
          maxLng: 2.4,
        },
      };

      // Act - Access private method through service instance
      const params = (service as any).buildSearchParams(query, options);

      // Assert
      expect(params).toEqual({
        q: query,
        countrycodes: options.countryCode,
        limit: options.limit,
        'accept-language': options.language,
        class: options.types,
        viewbox: '2.2,48.9,2.4,48.8',
        bounded: 1,
        format: 'json',
        addressdetails: 1,
        extratags: 1,
        namedetails: 1,
      });
    });

    it('should handle missing optional parameters', async () => {
      // Arrange
      const query = 'test query';

      // Act
      const params = (service as any).buildSearchParams(query, {});

      // Assert
      expect(params).toEqual({
        q: query,
        format: 'json',
        addressdetails: 1,
        extratags: 1,
        namedetails: 1,
      });
    });
  });

  describe('transformToSmartLocation', () => {
    it('should transform Nominatim place to SmartLocation', async () => {
      // Arrange
      const nominatimPlace = {
        place_id: 27997739,
        osm_type: 'way',
        osm_id: 27997739,
        lat: '48.8583701',
        lon: '2.2944813',
        display_name: 'Tour Eiffel, Avenue Gustave Eiffel, Paris, France',
        class: 'tourism',
        type: 'attraction',
        importance: 0.896,
        address: {
          attraction: 'Tour Eiffel',
          road: 'Avenue Gustave Eiffel',
          city: 'Paris',
          country: 'France',
          country_code: 'fr',
        },
        extratags: {
          website: 'https://www.toureiffel.paris',
          height: '330',
        },
      };

      // Act
      const result = (service as any).transformToSmartLocation(nominatimPlace);

      // Assert
      expect(result).toMatchObject({
        id: 'nominatim_27997739',
        name: 'Tour Eiffel',
        coordinates: { lat: 48.8583701, lng: 2.2944813 },
        country: 'France',
        countryCode: 'FR',
        source: LocationSource.NOMINATIM,
        placeType: 'attraction',
        importance: 0.896,
        metadata: expect.objectContaining({
          osm_id: 27997739,
          osm_type: 'way',
          class: 'tourism',
          type: 'attraction',
          website: 'https://www.toureiffel.paris',
          height: '330',
        }),
      });
    });

    it('should handle missing optional fields', async () => {
      // Arrange
      const minimalPlace = {
        place_id: 123456,
        lat: '0',
        lon: '0',
        display_name: 'Test Place',
        type: 'place',
      };

      // Act
      const result = (service as any).transformToSmartLocation(minimalPlace);

      // Assert
      expect(result).toMatchObject({
        id: 'nominatim_123456',
        name: 'Test Place',
        coordinates: { lat: 0, lng: 0 },
        source: LocationSource.NOMINATIM,
        placeType: 'place',
      });
    });

    it('should extract country code from address', async () => {
      // Arrange
      const placeWithAddress = {
        place_id: 123456,
        lat: '51.5074',
        lon: '-0.1278',
        display_name: 'London, UK',
        address: {
          city: 'London',
          country: 'United Kingdom',
          country_code: 'gb',
        },
      };

      // Act
      const result = (service as any).transformToSmartLocation(
        placeWithAddress,
      );

      // Assert
      expect(result.country).toBe('United Kingdom');
      expect(result.countryCode).toBe('GB');
    });
  });

  describe('generateCacheKey', () => {
    it('should generate consistent cache keys', async () => {
      // Arrange
      const method = 'search';
      const params = { q: 'test', limit: 10 };

      // Act
      const key1 = (service as any).generateCacheKey(method, params);
      const key2 = (service as any).generateCacheKey(method, params);

      // Assert
      expect(key1).toBe(key2);
      expect(key1).toContain('nominatim_search_');
    });

    it('should generate different keys for different parameters', async () => {
      // Arrange
      const method = 'search';
      const params1 = { q: 'test1', limit: 10 };
      const params2 = { q: 'test2', limit: 10 };

      // Act
      const key1 = (service as any).generateCacheKey(method, params1);
      const key2 = (service as any).generateCacheKey(method, params2);

      // Assert
      expect(key1).not.toBe(key2);
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      // Arrange
      const query = 'test query';
      const timeoutError = new Error('TIMEOUT');
      timeoutError.name = 'TIMEOUT';

      mockCacheService.get.mockReturnValue(null);
      mockedAxios.get.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(service.searchPlaces(query)).rejects.toThrow(HttpException);
    });

    it('should handle malformed API responses', async () => {
      // Arrange
      const query = 'test query';
      const malformedResponse = {
        data: 'invalid json response',
      };

      mockCacheService.get.mockReturnValue(null);
      mockedAxios.get.mockResolvedValue(malformedResponse);

      // Act
      const result = await service.searchPlaces(query);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle API rate limiting from Nominatim', async () => {
      // Arrange
      const query = 'test query';
      const rateLimitError = {
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' },
        },
      };

      mockCacheService.get.mockReturnValue(null);
      mockedAxios.get.mockRejectedValue(rateLimitError);

      // Act & Assert
      await expect(service.searchPlaces(query)).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.TOO_MANY_REQUESTS,
        }),
      );
    });

    it('should handle invalid coordinates gracefully', async () => {
      // Arrange
      const invalidCoordinates = { lat: 200, lng: -200 };

      // Act & Assert
      await expect(
        service.reverseGeocode(invalidCoordinates.lat, invalidCoordinates.lng),
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.BAD_REQUEST,
        }),
      );
    });
  });

  describe('Cache Integration', () => {
    it('should cache successful search results', async () => {
      // Arrange
      const query = 'Paris';
      const mockResponse = {
        data: [
          {
            place_id: 123456,
            lat: '48.8566',
            lon: '2.3522',
            display_name: 'Paris, France',
            type: 'city',
          },
        ],
      };

      mockCacheService.get.mockReturnValue(null);
      mockedAxios.get.mockResolvedValue(mockResponse);

      // Act
      await service.searchPlaces(query);

      // Assert
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('nominatim_search_'),
        expect.any(Array),
        expect.any(Number),
      );
    });

    it('should use different cache TTL for different request types', async () => {
      // Arrange
      const coordinates = { lat: 48.8566, lng: 2.3522 };
      const mockResponse = {
        data: {
          place_id: 123456,
          lat: '48.8566',
          lon: '2.3522',
          display_name: 'Paris, France',
        },
      };

      mockCacheService.get.mockReturnValue(null);
      mockedAxios.get.mockResolvedValue(mockResponse);

      // Act
      await service.reverseGeocode(coordinates.lat, coordinates.lng);

      // Assert
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        7200, // 2 hours TTL for reverse geocoding
      );
    });
  });

  describe('Request Headers and Rate Limiting', () => {
    it('should include proper User-Agent header', async () => {
      // Arrange
      const query = 'test query';
      const mockResponse = { data: [] };

      mockCacheService.get.mockReturnValue(null);
      mockedAxios.get.mockResolvedValue(mockResponse);

      // Act
      await service.searchPlaces(query);

      // Assert
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('TripMaster'),
          }),
        }),
      );
    });

    it('should respect API throttling limits', async () => {
      // Arrange
      const query = 'test query';
      mockApiThrottleService.checkAndLog.mockReturnValue(false);

      // Act & Assert
      await expect(service.searchPlaces(query)).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.TOO_MANY_REQUESTS,
        }),
      );
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });
});
