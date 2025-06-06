import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import axios from 'axios';

import { WeatherService } from './weather.service';
import { APIThrottleService } from '../../shared/services/api-throttle.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WeatherService', () => {
  let service: WeatherService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockApiThrottleService = {
    checkAndLog: jest.fn(),
    getUsageStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
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

    service = module.get<WeatherService>(WeatherService);

    // Setup default config values
    mockConfigService.get.mockImplementation(
      (key: string): string | undefined => {
        const config: Record<string, string> = {
          OPENWEATHER_API_KEY: 'test-openweather-key',
        };
        return config[key];
      },
    );

    // Setup default API throttle service responses
    mockApiThrottleService.checkAndLog.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWeather', () => {
    it('should return weather data successfully', async () => {
      // Arrange
      const currentWeatherResponse = {
        data: {
          weather: [
            {
              id: 800,
              main: 'Clear',
              description: 'clear sky',
              icon: '01d',
            },
          ],
          main: {
            temp: 32.5,
            feels_like: 36.2,
            temp_min: 30.0,
            temp_max: 35.0,
            pressure: 1013,
            humidity: 78,
          },
          visibility: 10000,
          wind: {
            speed: 3.2,
            deg: 220,
          },
          clouds: {
            all: 0,
          },
          dt: 1609459200,
          sys: {
            country: 'VN',
            sunrise: 1609455600,
            sunset: 1609497600,
          },
          timezone: 25200,
          id: 1566083,
          name: 'Ho Chi Minh City',
          cod: 200,
        },
      };

      const forecastResponse = {
        data: {
          list: [
            {
              dt: 1609459200,
              main: {
                temp: 30.0,
                temp_min: 28.0,
                temp_max: 32.0,
                humidity: 75,
              },
              weather: [
                {
                  id: 800,
                  main: 'Clear',
                  description: 'clear sky',
                  icon: '01d',
                },
              ],
              rain: {
                '3h': 0.1,
              },
              dt_txt: '2024-01-01 12:00:00',
            },
          ],
          city: {
            name: 'Ho Chi Minh City',
            country: 'VN',
          },
        },
      };

      const geocodingResponse = {
        data: [
          {
            name: 'Ho Chi Minh City',
            lat: 10.8231,
            lon: 106.6297,
            country: 'VN',
          },
        ],
      };

      // Ensure API throttle service allows the request
      mockApiThrottleService.checkAndLog.mockReturnValue(true);

      // Mock API calls: current weather, forecast, and geocoding
      mockedAxios.get
        .mockResolvedValueOnce(currentWeatherResponse) // Current weather
        .mockResolvedValueOnce(forecastResponse) // Forecast
        .mockResolvedValueOnce(geocodingResponse); // Geocoding for location name

      // Act
      const result = await service.getWeather(10.8231, 106.6297);

      // Assert
      expect(result.current.temperature).toBe(32.5);
      expect(result.current.description).toBe('clear sky');
      expect(result.current.humidity).toBe(78);
      expect(result.current.windSpeed).toBe(3.2);
      expect(result.location.name).toBe('Ho Chi Minh City, VN');
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should handle rate limits', async () => {
      // Arrange
      mockApiThrottleService.checkAndLog.mockReturnValue(false);

      // Act & Assert
      await expect(service.getWeather(10.8231, 106.6297)).rejects.toThrow(
        HttpException,
      );
    });

    it('should handle API errors', async () => {
      // Arrange
      mockApiThrottleService.checkAndLog.mockReturnValue(true);
      mockedAxios.get.mockRejectedValue(new Error('API error'));

      // Act & Assert
      await expect(service.getWeather(10.8231, 106.6297)).rejects.toThrow(
        HttpException,
      );
    });
  });
});
