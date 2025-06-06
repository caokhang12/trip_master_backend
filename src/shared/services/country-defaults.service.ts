import { Injectable } from '@nestjs/common';

/**
 * Country-aware defaults interface
 */
export interface CountryDefaults {
  currency: string;
  timezone: string;
  language: string;
}

/**
 * Service for providing country-aware defaults for trips
 */
@Injectable()
export class CountryDefaultsService {
  /**
   * Mapping of ISO 3166-1 alpha-2 country codes to their defaults
   */
  private readonly countryDefaults: Record<string, CountryDefaults> = {
    // Asia-Pacific
    JP: { currency: 'JPY', timezone: 'Asia/Tokyo', language: 'ja' },
    KR: { currency: 'KRW', timezone: 'Asia/Seoul', language: 'ko' },
    CN: { currency: 'CNY', timezone: 'Asia/Shanghai', language: 'zh' },
    TH: { currency: 'THB', timezone: 'Asia/Bangkok', language: 'th' },
    SG: { currency: 'SGD', timezone: 'Asia/Singapore', language: 'en' },
    MY: { currency: 'MYR', timezone: 'Asia/Kuala_Lumpur', language: 'en' },
    ID: { currency: 'IDR', timezone: 'Asia/Jakarta', language: 'id' },
    PH: { currency: 'PHP', timezone: 'Asia/Manila', language: 'en' },
    VN: { currency: 'VND', timezone: 'Asia/Ho_Chi_Minh', language: 'vi' },
    IN: { currency: 'INR', timezone: 'Asia/Kolkata', language: 'en' },
    AU: { currency: 'AUD', timezone: 'Australia/Sydney', language: 'en' },
    NZ: { currency: 'NZD', timezone: 'Pacific/Auckland', language: 'en' },

    // Europe
    GB: { currency: 'GBP', timezone: 'Europe/London', language: 'en' },
    FR: { currency: 'EUR', timezone: 'Europe/Paris', language: 'fr' },
    DE: { currency: 'EUR', timezone: 'Europe/Berlin', language: 'de' },
    IT: { currency: 'EUR', timezone: 'Europe/Rome', language: 'it' },
    ES: { currency: 'EUR', timezone: 'Europe/Madrid', language: 'es' },
    CH: { currency: 'CHF', timezone: 'Europe/Zurich', language: 'de' },
    NL: { currency: 'EUR', timezone: 'Europe/Amsterdam', language: 'nl' },
    BE: { currency: 'EUR', timezone: 'Europe/Brussels', language: 'fr' },
    AT: { currency: 'EUR', timezone: 'Europe/Vienna', language: 'de' },
    SE: { currency: 'SEK', timezone: 'Europe/Stockholm', language: 'sv' },
    NO: { currency: 'NOK', timezone: 'Europe/Oslo', language: 'no' },
    DK: { currency: 'DKK', timezone: 'Europe/Copenhagen', language: 'da' },
    FI: { currency: 'EUR', timezone: 'Europe/Helsinki', language: 'fi' },
    RU: { currency: 'RUB', timezone: 'Europe/Moscow', language: 'ru' },

    // North America
    US: { currency: 'USD', timezone: 'America/New_York', language: 'en' },
    CA: { currency: 'CAD', timezone: 'America/Toronto', language: 'en' },
    MX: { currency: 'MXN', timezone: 'America/Mexico_City', language: 'es' },

    // Other popular destinations
    AE: { currency: 'AED', timezone: 'Asia/Dubai', language: 'ar' },
    EG: { currency: 'EGP', timezone: 'Africa/Cairo', language: 'ar' },
    ZA: { currency: 'ZAR', timezone: 'Africa/Johannesburg', language: 'en' },
    BR: { currency: 'BRL', timezone: 'America/Sao_Paulo', language: 'pt' },
    AR: { currency: 'ARS', timezone: 'America/Buenos_Aires', language: 'es' },
    TR: { currency: 'TRY', timezone: 'Europe/Istanbul', language: 'tr' },
    MA: { currency: 'MAD', timezone: 'Africa/Casablanca', language: 'ar' },
    IL: { currency: 'ILS', timezone: 'Asia/Jerusalem', language: 'he' },
  };

  /**
   * Get country defaults by ISO 3166-1 alpha-2 country code
   */
  getCountryDefaults(countryCode: string): CountryDefaults | null {
    if (!countryCode || countryCode.length !== 2) {
      return null;
    }

    return this.countryDefaults[countryCode.toUpperCase()] || null;
  }

  /**
   * Get default currency for a country
   */
  getDefaultCurrency(countryCode: string): string | null {
    const defaults = this.getCountryDefaults(countryCode);
    return defaults?.currency || null;
  }

  /**
   * Get default timezone for a country
   */
  getDefaultTimezone(countryCode: string): string | null {
    const defaults = this.getCountryDefaults(countryCode);
    return defaults?.timezone || null;
  }

  /**
   * Get default language for a country
   */
  getDefaultLanguage(countryCode: string): string | null {
    const defaults = this.getCountryDefaults(countryCode);
    return defaults?.language || null;
  }

  /**
   * Check if a country code is supported
   */
  isCountrySupported(countryCode: string): boolean {
    return this.getCountryDefaults(countryCode) !== null;
  }

  /**
   * Get all supported country codes
   */
  getSupportedCountries(): string[] {
    return Object.keys(this.countryDefaults);
  }

  /**
   * Apply country defaults to trip data
   */
  applyCountryDefaults(
    countryCode: string,
    tripData: {
      defaultCurrency?: string;
      timezone?: string;
      currency?: string;
    },
  ): {
    defaultCurrency?: string;
    timezone?: string;
    currency?: string;
  } {
    const defaults = this.getCountryDefaults(countryCode);
    if (!defaults) {
      return tripData;
    }

    return {
      ...tripData,
      defaultCurrency: tripData.defaultCurrency || defaults.currency,
      timezone: tripData.timezone || defaults.timezone,
      currency: tripData.currency || defaults.currency,
    };
  }
}
