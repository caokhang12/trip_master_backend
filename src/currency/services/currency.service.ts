import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { APIThrottleService } from '../../shared/services/api-throttle.service';
import { ErrorUtilService } from '../../shared/utils/error.util';

export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
  lastUpdated: string;
  source: string;
}

export interface CurrencyConversion {
  from: string;
  to: string;
  amount: number;
  convertedAmount: number;
  exchangeRate: number;
  formattedAmount: string;
  conversionDate: string;
}

// API Response interfaces for type safety
interface ExchangeRateAPIResponse {
  result: string;
  base_code: string;
  conversion_rates: Record<string, number>;
  time_last_update_utc: string;
}

interface FixerIOResponse {
  success: boolean;
  timestamp?: number;
  base?: string;
  date?: string;
  rates?: Record<string, number>;
  error?: {
    code: number;
    type: string;
    info: string;
  };
}

interface ExchangeRatesAPIResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

/**
 * Currency service for exchange rates and conversions with VND support
 */
@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  // In-memory cache for exchange rates (use Redis in production)
  private ratesCache: Map<string, { data: ExchangeRates; timestamp: number }> =
    new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour

  // Currency symbols mapping
  private readonly currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    VND: '₫',
    THB: '฿',
    SGD: 'S$',
    CNY: '¥',
    KRW: '₩',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'CHF',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
  };

  constructor(
    private configService: ConfigService,
    private apiThrottleService: APIThrottleService,
  ) {}

  /**
   * Get exchange rates for specified currencies
   */
  async getExchangeRates(
    base: string = 'USD',
    currencies: string[] = ['VND', 'EUR', 'GBP', 'JPY', 'THB', 'SGD'],
  ): Promise<ExchangeRates> {
    try {
      this.logger.log(
        `Getting exchange rates for ${base} to [${currencies.join(', ')}]`,
      );

      const cacheKey = `${base}_${currencies.sort().join(',')}`;

      // Check cache first
      const cached = this.ratesCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        this.logger.log('Returning cached exchange rates');
        return cached.data;
      }

      // Check API throttle
      if (!this.apiThrottleService.checkAndLog('exchangerate')) {
        // Return cached data even if stale, or throw error
        if (cached) {
          this.logger.warn(
            'Returning stale exchange rate data due to rate limits',
          );
          return cached.data;
        }

        throw new HttpException(
          'Exchange rate service temporarily unavailable due to rate limits',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Fetch fresh rates
      const rates = await this.fetchExchangeRates(base, currencies);

      // Cache the result
      this.ratesCache.set(cacheKey, {
        data: rates,
        timestamp: Date.now(),
      });

      return rates;
    } catch (error: unknown) {
      this.logger.error(
        `Exchange rates service error: ${ErrorUtilService.getErrorMessage(error)}`,
        ErrorUtilService.getErrorStack(error),
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Exchange rates service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Convert currency amount
   */
  async convertCurrency(
    amount: number,
    from: string,
    to: string,
  ): Promise<CurrencyConversion> {
    try {
      this.logger.log(`Converting ${amount} ${from} to ${to}`);

      // If same currency, return as-is
      if (from.toUpperCase() === to.toUpperCase()) {
        return {
          from: from.toUpperCase(),
          to: to.toUpperCase(),
          amount,
          convertedAmount: amount,
          exchangeRate: 1,
          formattedAmount: this.formatCurrency(amount, to.toUpperCase()),
          conversionDate: new Date().toISOString(),
        };
      }

      // Get exchange rates
      const rates = await this.getExchangeRates(from.toUpperCase(), [
        to.toUpperCase(),
      ]);
      const exchangeRate = rates.rates[to.toUpperCase()];

      if (!exchangeRate) {
        throw new HttpException(
          `Exchange rate not available for ${to.toUpperCase()}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const convertedAmount = amount * exchangeRate;

      return {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        amount,
        convertedAmount: Math.round(convertedAmount * 100) / 100,
        exchangeRate,
        formattedAmount: this.formatCurrency(convertedAmount, to.toUpperCase()),
        conversionDate: new Date().toISOString(),
      };
    } catch (error: unknown) {
      this.logger.error(
        `Currency conversion error: ${ErrorUtilService.getErrorMessage(error)}`,
        ErrorUtilService.getErrorStack(error),
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Currency conversion service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Get popular currencies for Vietnam travelers
   */
  getPopularCurrencies(): { code: string; name: string; symbol: string }[] {
    return [
      { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'THB', name: 'Thai Baht', symbol: '฿' },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    ];
  }

  /**
   * Fetch exchange rates from API
   */
  private async fetchExchangeRates(
    base: string,
    currencies: string[],
  ): Promise<ExchangeRates> {
    // Try ExchangeRate-API first (free tier: 1500 requests/month)
    try {
      const apiKey = this.configService.get<string>('EXCHANGERATE_API_KEY');
      if (apiKey) {
        return await this.fetchFromExchangeRateAPI(base, currencies, apiKey);
      }
    } catch (error: unknown) {
      this.logger.warn(
        `ExchangeRate-API failed: ${ErrorUtilService.getErrorMessage(error)}`,
      );
    }

    // Fallback to Fixer.io (free tier: 100 requests/month)
    try {
      const fixerApiKey = this.configService.get<string>('FIXER_API_KEY');
      if (fixerApiKey) {
        return await this.fetchFromFixerIO(base, currencies, fixerApiKey);
      }
    } catch (error: unknown) {
      this.logger.warn(
        `Fixer.io failed: ${ErrorUtilService.getErrorMessage(error)}`,
      );
    }

    // Last fallback to ExchangeRatesAPI (free, no key required)
    try {
      return await this.fetchFromExchangeRatesAPI(base, currencies);
    } catch (error: unknown) {
      this.logger.error(
        `All exchange rate APIs failed: ${ErrorUtilService.getErrorMessage(error)}`,
      );
      throw new HttpException(
        'All exchange rate services are unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Fetch from ExchangeRate-API
   */
  private async fetchFromExchangeRateAPI(
    base: string,
    currencies: string[],
    apiKey: string,
  ): Promise<ExchangeRates> {
    const response = await axios.get<ExchangeRateAPIResponse>(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`,
      { timeout: 5000 },
    );

    const data = response.data;
    const filteredRates: Record<string, number> = {};

    for (const currency of currencies) {
      if (data.conversion_rates[currency]) {
        filteredRates[currency] = data.conversion_rates[currency];
      }
    }

    return {
      base: data.base_code,
      date: data.time_last_update_utc.split(' ')[0],
      rates: filteredRates,
      lastUpdated: data.time_last_update_utc,
      source: 'exchangerate-api',
    };
  }

  /**
   * Fetch from Fixer.io
   */
  private async fetchFromFixerIO(
    base: string,
    currencies: string[],
    apiKey: string,
  ): Promise<ExchangeRates> {
    const response = await axios.get<FixerIOResponse>(
      'https://api.fixer.io/latest',
      {
        params: {
          access_key: apiKey,
          base,
          symbols: currencies.join(','),
        },
        timeout: 5000,
      },
    );

    const data = response.data;

    if (!data.success) {
      const errorMessage = data.error?.info || 'Unknown error';
      throw new Error(`Fixer.io API error: ${errorMessage}`);
    }

    if (!data.base || !data.date || !data.rates) {
      throw new Error('Invalid response from Fixer.io API');
    }

    return {
      base: data.base,
      date: data.date,
      rates: data.rates,
      lastUpdated: new Date().toISOString(),
      source: 'fixer.io',
    };
  }

  /**
   * Fetch from ExchangeRatesAPI (free fallback)
   */
  private async fetchFromExchangeRatesAPI(
    base: string,
    currencies: string[],
  ): Promise<ExchangeRates> {
    const response = await axios.get<ExchangeRatesAPIResponse>(
      'https://api.exchangeratesapi.io/latest',
      {
        params: {
          base,
          symbols: currencies.join(','),
        },
        timeout: 5000,
      },
    );

    const data = response.data;

    return {
      base: data.base,
      date: data.date,
      rates: data.rates,
      lastUpdated: new Date().toISOString(),
      source: 'exchangeratesapi.io',
    };
  }

  /**
   * Format currency amount with proper symbol and locale
   */
  private formatCurrency(amount: number, currency: string): string {
    const symbol = this.currencySymbols[currency] || currency;

    // Special formatting for specific currencies
    switch (currency) {
      case 'VND':
        // Vietnamese Dong - no decimal places, comma separators
        return `${Math.round(amount).toLocaleString('vi-VN')} ${symbol}`;

      case 'JPY':
      case 'KRW':
        // Japanese Yen and Korean Won - no decimal places
        return `${symbol}${Math.round(amount).toLocaleString()}`;

      case 'USD':
      case 'EUR':
      case 'GBP':
      case 'AUD':
      case 'CAD':
        // Standard Western currencies - 2 decimal places
        return `${symbol}${amount.toFixed(2)}`;

      default:
        // Default formatting
        return `${amount.toFixed(2)} ${symbol}`;
    }
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.ratesCache.clear();
    this.logger.log('Exchange rates cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.ratesCache.size,
      keys: Array.from(this.ratesCache.keys()),
    };
  }
}
