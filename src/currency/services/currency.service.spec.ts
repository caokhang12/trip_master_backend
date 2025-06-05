import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

import { CurrencyService } from './currency.service';
import { APIThrottleService } from '../../shared/services/api-throttle.service';
import { CurrencyConversionDto } from '../dto/currency.dto';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CurrencyService', () => {
  let service: CurrencyService;

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
        CurrencyService,
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

    service = module.get<CurrencyService>(CurrencyService);

    // Setup default config values
    mockConfigService.get.mockImplementation(
      (key: string): string | undefined => {
        const config: Record<string, string> = {
          EXCHANGERATE_API_KEY: 'test-exchangerate-key',
          FIXER_API_KEY: 'test-fixer-key',
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

  describe('convertCurrency', () => {
    const conversionDto: CurrencyConversionDto = {
      amount: 100,
      from: 'USD',
      to: 'VND',
    };

    it('should convert currency using ExchangeRate-API (primary)', async () => {
      // Arrange
      const exchangeRateResponse = {
        data: {
          result: 'success',
          conversion_rates: {
            VND: 24500,
          },
          base_code: 'USD',
        },
      };

      // Ensure API throttle service allows the request
      mockApiThrottleService.checkAndLog.mockReturnValue(true);
      mockedAxios.get.mockResolvedValueOnce(exchangeRateResponse);

      // Act
      const result = await service.convertCurrency(
        conversionDto.amount,
        conversionDto.from,
        conversionDto.to,
      );

      // Assert
      expect(result.convertedAmount).toBe(2450000);
      expect(result.exchangeRate).toBe(24500);
      expect(result.from).toBe('USD');
      expect(result.to).toBe('VND');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('exchangerate-api.com'),
        expect.any(Object),
      );
    });

    it('should fallback to Fixer.io when primary API fails', async () => {
      // Arrange
      const fixerResponse = {
        data: {
          success: true,
          rates: {
            VND: 24500,
          },
          base: 'USD',
        },
      };

      mockedAxios.get
        .mockRejectedValueOnce(new Error('ExchangeRate API failed'))
        .mockResolvedValue(fixerResponse);

      // Act
      const result = await service.convertCurrency(
        conversionDto.amount,
        conversionDto.from,
        conversionDto.to,
      );

      // Assert
      expect(result.convertedAmount).toBe(2450000);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should fallback to ExchangeRatesAPI when other APIs fail', async () => {
      // Arrange
      const exchangeRatesResponse = {
        data: {
          rates: {
            VND: 24500,
          },
          base: 'USD',
        },
      };

      mockedAxios.get
        .mockRejectedValueOnce(new Error('ExchangeRate API failed'))
        .mockRejectedValueOnce(new Error('Fixer API failed'))
        .mockResolvedValue(exchangeRatesResponse);

      // Act
      const result = await service.convertCurrency(
        conversionDto.amount,
        conversionDto.from,
        conversionDto.to,
      );

      // Assert
      expect(result.convertedAmount).toBe(2450000);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should handle same currency conversion', async () => {
      // Arrange
      const sameCurrencyDto: CurrencyConversionDto = {
        amount: 100,
        from: 'USD',
        to: 'USD',
      };

      // Act
      const result = await service.convertCurrency(
        sameCurrencyDto.amount,
        sameCurrencyDto.from,
        sameCurrencyDto.to,
      );

      // Assert
      expect(result.convertedAmount).toBe(100);
      expect(result.exchangeRate).toBe(1);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should handle VND formatting correctly', async () => {
      // Arrange
      const vndConversionDto: CurrencyConversionDto = {
        amount: 1,
        from: 'USD',
        to: 'VND',
      };

      const exchangeRateResponse = {
        data: {
          result: 'success',
          conversion_rates: {
            VND: 24500,
          },
          base_code: 'USD',
        },
      };

      mockedAxios.get.mockResolvedValue(exchangeRateResponse);

      // Act
      const result = await service.convertCurrency(
        vndConversionDto.amount,
        vndConversionDto.from,
        vndConversionDto.to,
      );

      // Assert
      expect(result.formattedAmount).toContain('₫');
      expect(result.formattedAmount).toContain('24,500');
    });

    it('should handle API throttle limits', async () => {
      // Arrange
      mockApiThrottleService.checkAndLog.mockReturnValue(false);

      // Act & Assert
      await expect(
        service.convertCurrency(
          conversionDto.amount,
          conversionDto.from,
          conversionDto.to,
        ),
      ).rejects.toThrow(
        new HttpException(
          'Exchange rate service temporarily unavailable due to rate limits',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
    });

    it('should throw error when all APIs fail', async () => {
      // Arrange
      mockedAxios.get
        .mockRejectedValueOnce(new Error('ExchangeRate API failed'))
        .mockRejectedValueOnce(new Error('Fixer API failed'))
        .mockRejectedValueOnce(new Error('ExchangeRatesAPI failed'));

      // Act & Assert
      await expect(
        service.convertCurrency(
          conversionDto.amount,
          conversionDto.from,
          conversionDto.to,
        ),
      ).rejects.toThrow(
        new HttpException(
          'All exchange rate services are unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );
    });

    it('should handle invalid currency codes', async () => {
      // Arrange
      const invalidCurrencyDto: CurrencyConversionDto = {
        amount: 100,
        from: 'INVALID',
        to: 'VND',
      };

      const errorResponse = {
        response: {
          status: 400,
          data: {
            error_type: 'unsupported-code',
          },
        },
      };

      mockedAxios.get.mockRejectedValue(errorResponse);

      // Act & Assert
      await expect(
        service.convertCurrency(
          invalidCurrencyDto.amount,
          invalidCurrencyDto.from,
          invalidCurrencyDto.to,
        ),
      ).rejects.toThrow(
        new HttpException(
          'All exchange rate services are unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );
    });
  });
});
