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
      const openWeatherResponse = {
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
              dt: 1609545600,
              main: {
                temp: 28.5,
                feels_like: 32.1,
                temp_min: 26.0,
                temp_max: 31.0,
                pressure: 1012,
                humidity: 82,
              },
              weather: [
                {
                  id: 801,
                  main: 'Clouds',
                  description: 'few clouds',
                  icon: '02d',
                },
              ],
              clouds: {
                all: 20,
              },
              wind: {
                speed: 2.8,
                deg: 210,
              },
              visibility: 10000,
              pop: 0.1,
              dt_txt: '2021-01-02 00:00:00',
            },
          ],
        },
      };

      // Ensure API throttle service allows the request
      mockApiThrottleService.checkAndLog.mockReturnValue(true);

      // Mock all axios calls
      mockedAxios.get
        .mockResolvedValueOnce(openWeatherResponse) // Current weather
        .mockResolvedValueOnce(forecastResponse) // Forecast
        .mockResolvedValueOnce(openWeatherResponse); // Location name

      // Act
      const result = await service.getWeather(10.8231, 106.6297);

      // Assert
      expect(result.current.temperature).toBe(32.5);
      expect(result.current.description).toBe('clear sky');
      expect(result.current.humidity).toBe(78);
      expect(result.current.windSpeed).toBe(3.2);
      expect(result.location.name).toBe('Ho Chi Minh City');
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('should handle API throttle limits', async () => {
      // Arrange
      mockApiThrottleService.checkAndLog.mockReturnValue(false);

      // Act & Assert
      await expect(service.getWeather(10.8231, 106.6297)).rejects.toThrow(
        HttpException,
      );
    });

    it('should handle API errors', async () => {
      // Arrange
      mockedAxios.get.mockRejectedValue(new Error('API error'));

      // Act & Assert
      await expect(service.getWeather(10.8231, 106.6297)).rejects.toThrow(
        HttpException,
      );
    });
  });
});
