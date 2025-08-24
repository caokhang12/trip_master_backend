import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../shared/services/cache.service';
import { LocationService } from './location.service';
import { SearchLocationDto, ReverseGeocodeRequest } from '../dto/location.dto';
import { APIThrottleService } from '../../shared/services/api-throttle.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LocationService', () => {
  let service: LocationService;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockThrottleService = {
    checkAndLog: jest.fn(() => true),
  } as unknown as APIThrottleService;

  const mockConfigService = {
    get: jest.fn((key: string): string | undefined => {
      const config: Record<string, string> = {
        NOMINATIM_URL: 'https://nominatim.openstreetmap.org',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: APIThrottleService,
          useValue: mockThrottleService,
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchLocations', () => {
    it('should search locations successfully', async () => {
      const searchDto: SearchLocationDto = {
        query: 'hanoi',
        limit: 5,
      };

      const mockResponse = {
        data: [
          {
            display_name: 'Hanoi, Vietnam',
            lat: '21.0285',
            lon: '105.8542',
            type: 'city',
            name: 'Hanoi',
            address: {
              country: 'Vietnam',
            },
          },
        ],
      };

      mockCacheService.get.mockReturnValue(null);
      mockedAxios.get.mockResolvedValue(mockResponse);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.searchLocations(searchDto);

      expect(result).toEqual({
        locations: [
          {
            name: 'Hanoi',
            displayName: 'Hanoi, Vietnam',
            lat: 21.0285,
            lon: 105.8542,
            type: 'city',
            address: 'Hanoi, Vietnam',
            country: 'Vietnam',
          },
        ],
        totalResults: 1,
        searchTime: expect.any(Number),
      });
    });

    it('should return cached results if available', async () => {
      const searchDto: SearchLocationDto = {
        query: 'hanoi',
        limit: 5,
      };

      const cachedData = {
        locations: [
          {
            name: 'Hanoi, Vietnam',
            displayName: 'Hanoi, Vietnam',
            lat: 21.0285,
            lon: 105.8542,
            type: 'city',
            address: 'Hanoi, Vietnam',
            country: 'Vietnam',
          },
        ],
        totalResults: 1,
        searchTime: 100,
      };

      mockCacheService.get.mockReturnValue(cachedData);

      const result = await service.searchLocations(searchDto);

      expect(result).toEqual(cachedData);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should handle search errors', async () => {
      const searchDto: SearchLocationDto = {
        query: 'invalid',
        limit: 5,
      };

      mockCacheService.get.mockReturnValue(null);
      mockedAxios.get.mockResolvedValue({
        data: [],
      });

      const result = await service.searchLocations(searchDto);

      expect(result).toEqual({
        locations: [],
        totalResults: 0,
        searchTime: expect.any(Number),
      });
    });
  });

  describe('reverseGeocode', () => {
    it('should reverse geocode successfully', async () => {
      const reverseDto: ReverseGeocodeRequest = {
        lat: 21.0285,
        lng: 105.8542,
      };

      const mockResponse = {
        data: {
          display_name: 'Hanoi, Vietnam',
          lat: '21.0285',
          lon: '105.8542',
          type: 'city',
          name: 'Hanoi',
          address: {
            country: 'Vietnam',
          },
        },
      };

      mockCacheService.get.mockReturnValue(null);
      mockedAxios.get.mockResolvedValue(mockResponse);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.reverseGeocode(reverseDto);

      expect(result).toEqual({
        name: 'Hanoi',
        displayName: 'Hanoi, Vietnam',
        lat: 21.0285,
        lon: 105.8542,
        type: 'city',
        address: 'Hanoi, Vietnam',
        country: 'Vietnam',
      });
    });

    it('should return cached results if available', async () => {
      const reverseDto: ReverseGeocodeRequest = {
        lat: 21.0285,
        lng: 105.8542,
      };

      const cachedData = {
        name: 'Hanoi',
        displayName: 'Hanoi, Vietnam',
        lat: 21.0285,
        lon: 105.8542,
        type: 'city',
        address: 'Hanoi, Vietnam',
        country: 'Vietnam',
      };

      mockCacheService.get.mockReturnValue(cachedData);

      const result = await service.reverseGeocode(reverseDto);

      expect(result).toEqual(cachedData);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should handle reverse geocode errors', async () => {
      const reverseDto: ReverseGeocodeRequest = {
        lat: 0,
        lng: 0,
      };

      mockCacheService.get.mockReturnValue(null);
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      await expect(service.reverseGeocode(reverseDto)).rejects.toThrow();
    });
  });
});
