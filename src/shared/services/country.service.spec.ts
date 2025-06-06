import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import axios from 'axios';

import {
  CountryService,
  CountryDetectionResult,
  EnrichedLocationData,
} from './country.service';
import {
  LocationService,
  Location,
} from '../../location/services/location.service';
import {
  CountryDefaultsService,
  CountryDefaults,
} from './country-defaults.service';
import {
  CurrencyService,
  ExchangeRates,
} from '../../currency/services/currency.service';
import { APIThrottleService } from './api-throttle.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CountryService', () => {
  let service: CountryService;

  const mockLocationService = {
    searchLocation: jest.fn(),
    isVietnameseQuery: jest.fn(),
  };

  const mockCountryDefaultsService = {
    getCountryDefaults: jest.fn(),
    isCountrySupported: jest.fn(),
  };

  const mockCurrencyService = {
    getExchangeRates: jest.fn(),
  };

  const mockApiThrottleService = {
    checkAndLog: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CountryService,
        {
          provide: LocationService,
          useValue: mockLocationService,
        },
        {
          provide: CountryDefaultsService,
          useValue: mockCountryDefaultsService,
        },
        {
          provide: CurrencyService,
          useValue: mockCurrencyService,
        },
        {
          provide: APIThrottleService,
          useValue: mockApiThrottleService,
        },
      ],
    }).compile();

    service = module.get<CountryService>(CountryService);

    // Setup default API throttle service response
    mockApiThrottleService.checkAndLog.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectCountryFromCoordinates', () => {
    const vietnamCoords = { lat: 10.8231, lng: 106.6297 }; // Ho Chi Minh City
    const internationalCoords = { lat: 40.7128, lng: -74.006 }; // New York

    it('should detect Vietnam from Vietnamese coordinates', async () => {
      // Arrange
      const mockDefaults: CountryDefaults = {
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
        language: 'vi',
      };
      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(
        mockDefaults,
      );

      const nominatimResponse = {
        data: {
          address: {
            state: 'Ho Chi Minh City',
            country: 'Vietnam',
            country_code: 'vn',
          },
        },
      };
      mockedAxios.get.mockResolvedValue(nominatimResponse);

      // Act
      const result = await service.detectCountryFromCoordinates(
        vietnamCoords.lat,
        vietnamCoords.lng,
      );

      // Assert
      expect(result.countryCode).toBe('VN');
      expect(result.countryName).toBe('Vietnam');
      expect(result.source).toBe('coordinates');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.defaults).toEqual(mockDefaults);
      expect(result.coordinates).toEqual(vietnamCoords);
    });

    it('should detect international country from coordinates', async () => {
      // Arrange
      const mockDefaults: CountryDefaults = {
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en',
      };
      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(
        mockDefaults,
      );

      const nominatimResponse = {
        data: {
          address: {
            country: 'United States',
            country_code: 'us',
            state: 'New York',
            city: 'New York',
          },
        },
      };
      mockedAxios.get.mockResolvedValue(nominatimResponse);

      // Act
      const result = await service.detectCountryFromCoordinates(
        internationalCoords.lat,
        internationalCoords.lng,
      );

      // Assert
      expect(result.countryCode).toBe('US');
      expect(result.countryName).toBe('United States');
      expect(result.source).toBe('coordinates');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.defaults).toEqual(mockDefaults);
    });

    it('should return cached result for same coordinates', async () => {
      // Arrange
      const mockDefaults: CountryDefaults = {
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
        language: 'vi',
      };
      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(
        mockDefaults,
      );

      const nominatimResponse = {
        data: {
          address: {
            country: 'Vietnam',
            country_code: 'vn',
          },
        },
      };
      mockedAxios.get.mockResolvedValue(nominatimResponse);

      // Act - First call
      const result1 = await service.detectCountryFromCoordinates(
        vietnamCoords.lat,
        vietnamCoords.lng,
      );

      // Act - Second call (should use cache)
      const result2 = await service.detectCountryFromCoordinates(
        vietnamCoords.lat,
        vietnamCoords.lng,
      );

      // Assert
      expect(result1).toEqual(result2);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // API called only once
    });

    it('should handle API failures gracefully with fallback', async () => {
      // Arrange
      const mockDefaults: CountryDefaults = {
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en',
      };
      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(
        mockDefaults,
      );
      mockedAxios.get.mockRejectedValue(new Error('Nominatim API failed'));

      // Act
      const result = await service.detectCountryFromCoordinates(
        internationalCoords.lat,
        internationalCoords.lng,
      );

      // Assert
      expect(result.source).toBe('fallback');
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.countryCode).toBe('US'); // Default fallback
    });

    it('should handle API throttle limits', async () => {
      // Arrange
      mockApiThrottleService.checkAndLog.mockReturnValue(false);
      const mockDefaults: CountryDefaults = {
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en',
      };
      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(
        mockDefaults,
      );

      // Act
      const result = await service.detectCountryFromCoordinates(
        internationalCoords.lat,
        internationalCoords.lng,
      );

      // Assert
      expect(result.source).toBe('fallback');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('getCountryDefaults', () => {
    it('should return enhanced country defaults with budget info', async () => {
      // Arrange
      const mockDefaults: CountryDefaults = {
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
        language: 'vi',
      };
      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(
        mockDefaults,
      );
      mockCountryDefaultsService.isCountrySupported.mockReturnValue(true);
      mockCurrencyService.getExchangeRates.mockResolvedValue({
        base: 'USD',
        date: '2024-06-05',
        rates: { VND: 23000 },
        lastUpdated: new Date().toISOString(),
        source: 'exchangerate-api',
      } as ExchangeRates);

      // Act
      const result = await service.getCountryDefaults('VN');

      // Assert
      expect(result.currency).toBe('VND');
      expect(result.timezone).toBe('Asia/Ho_Chi_Minh');
      expect(result.language).toBe('vi');
      expect(result.budgetInfo).toBeDefined();
      expect(result.budgetInfo.budget).toBe(15); // Vietnam budget
      expect(result.travelInsights).toBeDefined();
      expect(result.travelInsights.isVietnamDestination).toBe(true);
    });

    it('should throw error for unsupported country', async () => {
      // Arrange
      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(null);

      // Act & Assert
      await expect(service.getCountryDefaults('XX')).rejects.toThrow(
        'Country XX is not supported',
      );
    });

    it('should provide default budget for unsupported countries in budget mapping', async () => {
      // Arrange
      const mockDefaults: CountryDefaults = {
        currency: 'EUR',
        timezone: 'Europe/Rome',
        language: 'it',
      };
      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(
        mockDefaults,
      );
      mockCountryDefaultsService.isCountrySupported.mockReturnValue(true);

      // Act - Using a country not in budget recommendations
      const result = await service.getCountryDefaults('IT');

      // Assert
      expect(result.budgetInfo).toBeDefined();
      expect(result.budgetInfo.budget).toBe(35); // Italy-specific budget
    });
  });

  describe('enrichLocationData', () => {
    const mockLocation: Location = {
      id: '123',
      name: 'Ho Chi Minh City',
      displayName: 'Ho Chi Minh City, Vietnam',
      coordinates: { lat: 10.8231, lng: 106.6297 },
      country: 'Vietnam',
      countryCode: 'VN',
      address: 'Ho Chi Minh City, Vietnam',
      placeType: 'city',
      source: 'test',
    };

    it('should enrich location data with comprehensive information', async () => {
      // Arrange
      mockLocationService.searchLocation.mockResolvedValue([mockLocation]);

      const mockDefaults: CountryDefaults = {
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
        language: 'vi',
      };
      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(
        mockDefaults,
      );

      const mockExchangeRates: ExchangeRates = {
        base: 'USD',
        date: '2024-01-01',
        rates: { VND: 23000 },
        lastUpdated: '2024-01-01T00:00:00Z',
        source: 'test',
      };
      mockCurrencyService.getExchangeRates.mockResolvedValue(mockExchangeRates);

      const nominatimResponse = {
        data: {
          address: {
            state: 'Ho Chi Minh City',
            country: 'Vietnam',
            country_code: 'vn',
          },
        },
      };
      mockedAxios.get.mockResolvedValue(nominatimResponse);

      // Act
      const result = await service.enrichLocationData('Ho Chi Minh City');

      // Assert
      expect(result.originalLocation).toEqual(mockLocation);
      expect(result.countryDetection.countryCode).toBe('VN');
      expect(result.budgetRecommendations).toBeDefined();
      expect(result.budgetRecommendations?.currency).toBe('VND');
      expect(result.travelInsights).toBeDefined();
      expect(result.travelInsights?.isVietnamDestination).toBe(true);
      expect(result.travelInsights?.vietnamSpecificInfo).toBeDefined();
      expect(result.travelInsights?.vietnamSpecificInfo?.region).toBe('south');
    });

    it('should use provided coordinates over location coordinates', async () => {
      // Arrange
      const providedCoords = { lat: 21.0285, lng: 105.8542 }; // Hanoi
      mockLocationService.searchLocation.mockResolvedValue([mockLocation]);

      const mockDefaults: CountryDefaults = {
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
        language: 'vi',
      };
      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(
        mockDefaults,
      );

      const nominatimResponse = {
        data: {
          address: {
            state: 'Hanoi',
            country: 'Vietnam',
            country_code: 'vn',
          },
        },
      };
      mockedAxios.get.mockResolvedValue(nominatimResponse);

      // Act
      const result = await service.enrichLocationData(
        'Ho Chi Minh City',
        providedCoords,
      );

      // Assert
      expect(result.countryDetection.coordinates).toEqual(providedCoords);
      expect(result.travelInsights?.vietnamSpecificInfo?.region).toBe('north'); // Hanoi is in north
    });

    it('should throw error when location is not found', async () => {
      // Arrange
      mockLocationService.searchLocation.mockResolvedValue([]);

      // Act & Assert
      await expect(
        service.enrichLocationData('Unknown Location'),
      ).rejects.toThrow('Location "Unknown Location" not found');
    });
  });

  describe('isVietnameseLocation', () => {
    it('should identify Vietnamese location by coordinates', () => {
      // Arrange
      const vietnameseLocation: Location = {
        id: '123',
        name: 'Ho Chi Minh City',
        displayName: 'Ho Chi Minh City, Vietnam',
        coordinates: { lat: 10.8231, lng: 106.6297 },
        country: 'Vietnam',
        countryCode: 'VN',
        address: 'Ho Chi Minh City, Vietnam',
        placeType: 'city',
        source: 'test',
      };

      // Act
      const result = service.isVietnameseLocation(vietnameseLocation);

      // Assert
      expect(result).toBe(true);
    });

    it('should identify Vietnamese location by country code', () => {
      // Arrange
      const vietnameseLocation: Location = {
        id: '123',
        name: 'Unknown Location',
        displayName: 'Unknown Location, Vietnam',
        coordinates: { lat: 0, lng: 0 }, // Outside Vietnam bounds
        country: 'Vietnam',
        countryCode: 'VN',
        address: 'Unknown Location, Vietnam',
        placeType: 'city',
        source: 'test',
      };

      // Act
      const result = service.isVietnameseLocation(vietnameseLocation);

      // Assert
      expect(result).toBe(true);
    });

    it('should identify Vietnamese location by string with Vietnamese characters', () => {
      // Act
      const result1 = service.isVietnameseLocation('Hồ Chí Minh');
      const result2 = service.isVietnameseLocation('Hà Nội');
      const result3 = service.isVietnameseLocation('Đà Nẵng');

      // Assert
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });

    it('should identify non-Vietnamese location', () => {
      // Arrange
      const internationalLocation: Location = {
        id: '123',
        name: 'New York',
        displayName: 'New York, United States',
        coordinates: { lat: 40.7128, lng: -74.006 },
        country: 'United States',
        countryCode: 'US',
        address: 'New York, United States',
        placeType: 'city',
        source: 'test',
      };

      // Act
      const result = service.isVietnameseLocation(internationalLocation);

      // Assert
      expect(result).toBe(false);
    });

    it('should identify non-Vietnamese location by string', () => {
      // Act
      const result1 = service.isVietnameseLocation('New York');
      const result2 = service.isVietnameseLocation('London');
      const result3 = service.isVietnameseLocation('Tokyo');

      // Assert
      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });
  });

  describe('formatLocationString', () => {
    it('should format location with all components', () => {
      // Act
      const result = service.formatLocationString(
        'Ho Chi Minh City',
        'Ho Chi Minh Province',
        'Vietnam',
      );

      // Assert
      expect(result).toBe('Ho Chi Minh City, Ho Chi Minh Province, Vietnam');
    });

    it('should format location without duplicate province', () => {
      // Act
      const result = service.formatLocationString(
        'Ho Chi Minh City',
        'Ho Chi Minh City',
        'Vietnam',
      );

      // Assert
      expect(result).toBe('Ho Chi Minh City, Vietnam');
    });

    it('should format location with only city', () => {
      // Act
      const result = service.formatLocationString('Ho Chi Minh City');

      // Assert
      expect(result).toBe('Ho Chi Minh City');
    });

    it('should format location with city and country only', () => {
      // Act
      const result = service.formatLocationString(
        'Ho Chi Minh City',
        undefined,
        'Vietnam',
      );

      // Assert
      expect(result).toBe('Ho Chi Minh City, Vietnam');
    });
  });

  describe('clearCache and getCacheStats', () => {
    it('should clear cache and return empty stats', () => {
      // Act
      service.clearCache();
      const stats = service.getCacheStats();

      // Assert
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should return cache stats after detection', async () => {
      // Arrange
      const mockDefaults: CountryDefaults = {
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
        language: 'vi',
      };
      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(
        mockDefaults,
      );

      const nominatimResponse = {
        data: {
          address: {
            country: 'Vietnam',
            country_code: 'vn',
          },
        },
      };
      mockedAxios.get.mockResolvedValue(nominatimResponse);

      // Act
      await service.detectCountryFromCoordinates(10.8231, 106.6297);
      const stats = service.getCacheStats();

      // Assert
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('coords_10.823_106.630');
    });
  });

  describe('Vietnam-specific features', () => {
    it('should provide north Vietnam region info for Hanoi coordinates', async () => {
      // Arrange
      const hanoiCoords = { lat: 21.0285, lng: 105.8542 };
      mockLocationService.searchLocation.mockResolvedValue([
        {
          id: '123',
          name: 'Hanoi',
          displayName: 'Hanoi, Vietnam',
          coordinates: hanoiCoords,
          country: 'Vietnam',
          countryCode: 'VN',
          address: 'Hanoi, Vietnam',
          placeType: 'city',
          source: 'test',
        },
      ]);

      const mockDefaults: CountryDefaults = {
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
        language: 'vi',
      };
      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(
        mockDefaults,
      );

      const nominatimResponse = {
        data: {
          address: {
            state: 'Hanoi',
            country: 'Vietnam',
            country_code: 'vn',
          },
        },
      };
      mockedAxios.get.mockResolvedValue(nominatimResponse);

      // Act
      const result = await service.enrichLocationData('Hanoi');

      // Assert
      expect(result.travelInsights?.vietnamSpecificInfo?.region).toBe('north');
      expect(
        result.travelInsights?.vietnamSpecificInfo?.popularProvinces,
      ).toContain('Hà Nội');
      expect(
        result.travelInsights?.vietnamSpecificInfo?.recommendedDuration,
      ).toBe('4-7 days');
    });

    it('should provide central Vietnam region info for Da Nang coordinates', async () => {
      // Arrange
      const daNangCoords = { lat: 16.0544, lng: 108.2022 };
      mockLocationService.searchLocation.mockResolvedValue([
        {
          id: '123',
          name: 'Da Nang',
          displayName: 'Da Nang, Vietnam',
          coordinates: daNangCoords,
          country: 'Vietnam',
          countryCode: 'VN',
          address: 'Da Nang, Vietnam',
          placeType: 'city',
          source: 'test',
        },
      ]);

      const mockDefaults: CountryDefaults = {
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
        language: 'vi',
      };
      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(
        mockDefaults,
      );

      const nominatimResponse = {
        data: {
          address: {
            state: 'Da Nang',
            country: 'Vietnam',
            country_code: 'vn',
          },
        },
      };
      mockedAxios.get.mockResolvedValue(nominatimResponse);

      // Act
      const result = await service.enrichLocationData('Da Nang');

      // Assert
      expect(result.travelInsights?.vietnamSpecificInfo?.region).toBe(
        'central',
      );
      expect(
        result.travelInsights?.vietnamSpecificInfo?.popularProvinces,
      ).toContain('Đà Nẵng');
      expect(
        result.travelInsights?.vietnamSpecificInfo?.recommendedDuration,
      ).toBe('5-8 days');
    });
  });

  describe('Budget recommendations', () => {
    it('should provide Vietnam-specific budget recommendations', async () => {
      // Arrange
      const mockDefaults: CountryDefaults = {
        currency: 'VND',
        timezone: 'Asia/Ho_Chi_Minh',
        language: 'vi',
      };
      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(
        mockDefaults,
      );

      // Act
      const result = await service.getCountryDefaults('VN');

      // Assert
      expect(result.budgetInfo.budget).toBe(15);
      expect(result.budgetInfo.backpacker).toBe(25);
      expect(result.budgetInfo.midRange).toBe(45);
      expect(result.budgetInfo.luxury).toBe(80);
    });

    it('should provide default budget for unmapped countries', async () => {
      // Arrange
      const mockDefaults: CountryDefaults = {
        currency: 'ZAR',
        timezone: 'Africa/Johannesburg',
        language: 'en',
      };
      mockCountryDefaultsService.getCountryDefaults.mockReturnValue(
        mockDefaults,
      );
      mockCountryDefaultsService.isCountrySupported.mockReturnValue(true);

      // Act
      const result = await service.getCountryDefaults('ZA');

      // Assert
      expect(result.budgetInfo.budget).toBe(25); // Default budget
      expect(result.budgetInfo.backpacker).toBe(40);
      expect(result.budgetInfo.midRange).toBe(70);
      expect(result.budgetInfo.luxury).toBe(120);
    });
  });
});
