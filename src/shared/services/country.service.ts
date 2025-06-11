import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { LocationService } from '../../location/services/location.service';
import { SmartLocation } from '../../location/interfaces/smart-location.interface';
import { LocationSearchDto } from '../../location/dto/location.dto';
import {
  CountryDefaultsService,
  CountryDefaults,
} from './country-defaults.service';
import { CurrencyService } from '../../currency/services/currency.service';
import { APIThrottleService } from './api-throttle.service';
import { ErrorUtilService } from '../utils/error.util';

/**
 * Enhanced country detection result interface
 */
export interface CountryDetectionResult {
  countryCode: string;
  countryName: string;
  confidence: number;
  source: 'coordinates' | 'location-name' | 'ip-detection' | 'fallback';
  coordinates?: {
    lat: number;
    lng: number;
  };
  administrativeInfo?: {
    province?: string;
    district?: string;
    city?: string;
  };
  defaults: CountryDefaults;
}

/**
 * Enhanced location data with country intelligence
 */
export interface EnrichedLocationData {
  originalLocation: SmartLocation;
  countryDetection: CountryDetectionResult;
  budgetRecommendations?: {
    currency: string;
    averageDailyBudget: {
      budget: number;
      backpacker: number;
      midRange: number;
      luxury: number;
    };
    currencySymbol: string;
  };
  travelInsights?: {
    bestTimeToVisit: string[];
    timeZone: string;
    language: string;
    isVietnamDestination: boolean;
    vietnamSpecificInfo?: {
      region: 'north' | 'central' | 'south';
      popularProvinces: string[];
      recommendedDuration: string;
    };
  };
}

/**
 * Vietnam region configuration for enhanced travel insights
 */
interface VietnamRegionInfo {
  region: 'north' | 'central' | 'south';
  popularProvinces: string[];
  recommendedDuration: string;
  coordinates: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

/**
 * Nominatim reverse geocoding response interface
 */
interface NominatimReverseResponse {
  address?: {
    country_code?: string;
    country?: string;
    state?: string;
    province?: string;
    county?: string;
    district?: string;
    city?: string;
    town?: string;
    village?: string;
  };
}

/**
 * Comprehensive country service for intelligent country detection and location enrichment
 * Integrates with existing LocationService, CurrencyService, and CountryDefaultsService
 */
@Injectable()
export class CountryService {
  private readonly logger = new Logger(CountryService.name);

  // In-memory cache for country detection results (use Redis in production)
  private countryCache: Map<
    string,
    { data: CountryDetectionResult; timestamp: number }
  > = new Map();
  private readonly CACHE_TTL = 7200000; // 2 hours for country detection

  // Vietnam regional configuration for enhanced insights
  private readonly vietnamRegions: Record<string, VietnamRegionInfo> = {
    north: {
      region: 'north',
      popularProvinces: [
        'Hà Nội',
        'Hạ Long',
        'Sapa',
        'Ninh Bình',
        'Hải Phòng',
        'Thái Nguyên',
      ],
      recommendedDuration: '4-7 days',
      coordinates: { north: 23.3, south: 20.0, east: 109.5, west: 102.0 },
    },
    central: {
      region: 'central',
      popularProvinces: [
        'Đà Nẵng',
        'Hội An',
        'Huế',
        'Phong Nha',
        'Quy Nhon',
        'Pleiku',
      ],
      recommendedDuration: '5-8 days',
      coordinates: { north: 20.0, south: 11.0, east: 109.5, west: 102.0 },
    },
    south: {
      region: 'south',
      popularProvinces: [
        'Hồ Chí Minh',
        'Cần Thơ',
        'Phú Quốc',
        'Vũng Tàu',
        'Đà Lạt',
        'Mũi Né',
      ],
      recommendedDuration: '3-6 days',
      coordinates: { north: 11.0, south: 8.5, east: 109.5, west: 102.0 },
    },
  };

  // Budget recommendations per country (USD per day)
  private readonly budgetRecommendations: Record<
    string,
    {
      budget: number;
      backpacker: number;
      midRange: number;
      luxury: number;
    }
  > = {
    VN: { budget: 15, backpacker: 25, midRange: 45, luxury: 80 },
    TH: { budget: 18, backpacker: 30, midRange: 55, luxury: 120 },
    JP: { budget: 45, backpacker: 70, midRange: 120, luxury: 200 },
    SG: { budget: 35, backpacker: 50, midRange: 90, luxury: 150 },
    MY: { budget: 20, backpacker: 35, midRange: 60, luxury: 100 },
    ID: { budget: 12, backpacker: 20, midRange: 40, luxury: 75 },
    PH: { budget: 15, backpacker: 25, midRange: 45, luxury: 85 },
    KR: { budget: 40, backpacker: 60, midRange: 100, luxury: 180 },
    CN: { budget: 25, backpacker: 40, midRange: 70, luxury: 130 },
    IN: { budget: 10, backpacker: 18, midRange: 35, luxury: 65 },
    // Europe
    GB: { budget: 50, backpacker: 75, midRange: 130, luxury: 250 },
    FR: { budget: 45, backpacker: 70, midRange: 120, luxury: 220 },
    DE: { budget: 40, backpacker: 65, midRange: 110, luxury: 200 },
    IT: { budget: 35, backpacker: 55, midRange: 95, luxury: 180 },
    ES: { budget: 30, backpacker: 50, midRange: 85, luxury: 160 },
    // North America
    US: { budget: 60, backpacker: 85, midRange: 150, luxury: 300 },
    CA: { budget: 55, backpacker: 80, midRange: 140, luxury: 280 },
    // Default fallback
    DEFAULT: { budget: 25, backpacker: 40, midRange: 70, luxury: 120 },
  };

  constructor(
    private readonly locationService: LocationService,
    private readonly countryDefaultsService: CountryDefaultsService,
    private readonly currencyService: CurrencyService,
    private readonly apiThrottleService: APIThrottleService,
  ) {}

  /**
   * Detect country from coordinates using reverse geocoding
   * Integrates with existing LocationService for intelligent detection
   */
  async detectCountryFromCoordinates(
    lat: number,
    lng: number,
  ): Promise<CountryDetectionResult> {
    try {
      this.logger.log(`Detecting country from coordinates: ${lat}, ${lng}`);

      // Create cache key for coordinates (rounded to 3 decimal places for reasonable caching)
      const cacheKey = `coords_${lat.toFixed(3)}_${lng.toFixed(3)}`;

      // Check cache first
      const cached = this.countryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        this.logger.log('Returning cached country detection result');
        return cached.data;
      }

      let detectionResult: CountryDetectionResult;

      // First, check if coordinates are in Vietnam using existing logic
      if (this.isInVietnam(lat, lng)) {
        detectionResult = await this.detectVietnameseLocation(lat, lng);
      } else {
        // Use reverse geocoding for international locations
        detectionResult = await this.detectInternationalLocation(lat, lng);
      }

      // Cache the result
      this.countryCache.set(cacheKey, {
        data: detectionResult,
        timestamp: Date.now(),
      });

      return detectionResult;
    } catch (error: unknown) {
      this.logger.error(
        `Country detection failed: ${ErrorUtilService.getErrorMessage(error)}`,
        ErrorUtilService.getErrorStack(error),
      );

      // Return fallback result
      return this.createFallbackDetectionResult(lat, lng);
    }
  }

  /**
   * Get enhanced country defaults with additional intelligence
   * Builds upon existing CountryDefaultsService with budget and travel insights
   */
  async getCountryDefaults(countryCode: string): Promise<
    CountryDefaults & {
      budgetInfo?: any;
      travelInsights?: any;
    }
  > {
    this.logger.log(`Getting country defaults for: ${countryCode}`);

    const baseDefaults =
      this.countryDefaultsService.getCountryDefaults(countryCode);
    if (!baseDefaults) {
      throw new Error(`Country ${countryCode} is not supported`);
    }

    const budgetInfo =
      this.budgetRecommendations[countryCode] ||
      this.budgetRecommendations.DEFAULT;

    return {
      ...baseDefaults,
      budgetInfo,
      travelInsights: {
        isVietnamDestination: countryCode === 'VN',
        supportedByLocationService:
          this.countryDefaultsService.isCountrySupported(countryCode),
        hasLocalCurrencySupport: await this.checkCurrencySupport(
          baseDefaults.currency,
        ),
      },
    };
  }

  /**
   * Enrich location data with comprehensive country intelligence
   * Integrates with all existing services for complete travel insights
   */
  async enrichLocationData(
    destinationName: string,
    coordinates?: { lat: number; lng: number },
  ): Promise<EnrichedLocationData> {
    try {
      this.logger.log(`Enriching location data for: ${destinationName}`);

      // First, search for the location using LocationService
      const searchDto: LocationSearchDto = {
        query: destinationName,
        limit: 1,
      };
      const searchResponse =
        await this.locationService.searchLocations(searchDto);

      if (searchResponse.results.length === 0) {
        throw new Error(`Location "${destinationName}" not found`);
      }

      const primaryLocation = searchResponse.results[0];

      // Use provided coordinates or location's coordinates for country detection
      const targetCoords = coordinates || primaryLocation.coordinates;
      const countryDetection = await this.detectCountryFromCoordinates(
        targetCoords.lat,
        targetCoords.lng,
      );

      // Get budget recommendations
      const budgetRecommendations = await this.getBudgetRecommendations(
        countryDetection.countryCode,
      );

      // Get travel insights
      const travelInsights = this.getTravelInsights(
        countryDetection.countryCode,
        targetCoords.lat,
      );

      return {
        originalLocation: primaryLocation,
        countryDetection,
        budgetRecommendations,
        travelInsights,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Location enrichment failed: ${ErrorUtilService.getErrorMessage(error)}`,
        ErrorUtilService.getErrorStack(error),
      );
      throw error;
    }
  }

  /**
   * Check if location is Vietnamese using existing LocationService logic
   * Leverages the sophisticated Vietnamese detection from LocationService
   */
  isVietnameseLocation(location: SmartLocation | string): boolean {
    if (typeof location === 'string') {
      // Use the same Vietnamese detection logic as LocationService
      return this.isVietnameseQuery(location);
    }

    // Check country information first for explicit country data
    if (location.countryCode === 'VN' || location.country === 'Vietnam') {
      return true;
    }

    // Check coordinates if country info is not available
    if (location.coordinates) {
      return this.isInVietnam(
        location.coordinates.lat,
        location.coordinates.lng,
      );
    }

    return false;
  }

  /**
   * Format location string with consistent formatting
   * Provides standardized location formatting across the application
   */
  formatLocationString(
    city: string,
    province?: string,
    country?: string,
  ): string {
    const parts = [city];

    if (province && province !== city) {
      parts.push(province);
    }

    if (country) {
      parts.push(country);
    }

    return parts.join(', ');
  }

  /**
   * Clear country detection cache
   */
  clearCache(): void {
    this.countryCache.clear();
    this.logger.log('Country detection cache cleared');
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.countryCache.size,
      keys: Array.from(this.countryCache.keys()),
    };
  }

  // Private helper methods

  /**
   * Check if coordinates are within Vietnam bounds
   * Uses the same logic as WeatherService for consistency
   */
  private isInVietnam(lat: number, lng: number): boolean {
    const vietnamBounds = {
      north: 23.3,
      south: 8.5,
      east: 109.5,
      west: 102.0,
    };

    return (
      lat >= vietnamBounds.south &&
      lat <= vietnamBounds.north &&
      lng >= vietnamBounds.west &&
      lng <= vietnamBounds.east
    );
  }

  /**
   * Check if query is likely Vietnamese
   * Replicates LocationService Vietnamese detection logic
   */
  private isVietnameseQuery(query: string): boolean {
    // Check for Vietnamese characters
    const vietnamesePattern =
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    if (vietnamesePattern.test(query)) {
      return true;
    }

    // Check for common Vietnamese place names
    const vietnamesePlaces = [
      'hồ chí minh',
      'sài gòn',
      'hà nội',
      'đà nẵng',
      'hải phòng',
      'cần thơ',
      'biên hòa',
      'nha trang',
      'bình dương',
      'đồng nai',
      'an giang',
      'bà rịa',
      'bạc liêu',
      'bắc giang',
      'bắc kạn',
      'bắc ninh',
      'bến tre',
      'bình định',
      'bình phước',
      'bình thuận',
      'cà mau',
      'cao bằng',
      'đắk lắk',
      'đắk nông',
    ];

    return vietnamesePlaces.some(
      (place) =>
        query.toLowerCase().includes(place) ||
        place.includes(query.toLowerCase()),
    );
  }

  /**
   * Detect Vietnamese location with enhanced province/region detection
   */
  private async detectVietnameseLocation(
    lat: number,
    lng: number,
  ): Promise<CountryDetectionResult> {
    try {
      // Get Vietnam region information for reference
      this.getVietnameseRegion(lat);

      // Try to get more specific location info using Nominatim as fallback
      let administrativeInfo = {
        province: '',
        district: '',
        city: '',
      };

      if (this.apiThrottleService.checkAndLog('nominatim')) {
        try {
          const response = await axios.get(
            'https://nominatim.openstreetmap.org/reverse',
            {
              params: {
                lat,
                lon: lng,
                format: 'json',
                addressdetails: 1,
                zoom: 10,
              },
              headers: {
                'User-Agent': 'TripMaster/1.0 (contact@tripmaster.com)',
              },
              timeout: 5000,
            },
          );

          const data = response.data as NominatimReverseResponse;
          if (data?.address) {
            administrativeInfo = {
              province: data.address.state || data.address.province || '',
              district: data.address.county || data.address.district || '',
              city:
                data.address.city ||
                data.address.town ||
                data.address.village ||
                '',
            };
          }
        } catch (error) {
          this.logger.warn(
            `Nominatim reverse geocoding failed: ${ErrorUtilService.getErrorMessage(error)}`,
          );
        }
      }

      const defaults = this.countryDefaultsService.getCountryDefaults('VN')!;

      return {
        countryCode: 'VN',
        countryName: 'Vietnam',
        confidence: 0.95,
        source: 'coordinates',
        coordinates: { lat, lng },
        administrativeInfo,
        defaults,
      };
    } catch (error: unknown) {
      this.logger.warn(
        `Vietnamese location detection failed: ${ErrorUtilService.getErrorMessage(error)}`,
      );
      return this.createFallbackDetectionResult(lat, lng, 'VN');
    }
  }

  /**
   * Detect international location using Nominatim reverse geocoding
   */
  private async detectInternationalLocation(
    lat: number,
    lng: number,
  ): Promise<CountryDetectionResult> {
    if (!this.apiThrottleService.checkAndLog('nominatim')) {
      return this.createFallbackDetectionResult(lat, lng);
    }

    try {
      const response = await axios.get(
        'https://nominatim.openstreetmap.org/reverse',
        {
          params: {
            lat,
            lon: lng,
            format: 'json',
            addressdetails: 1,
            zoom: 5, // Country level
          },
          headers: {
            'User-Agent': 'TripMaster/1.0 (contact@tripmaster.com)',
          },
          timeout: 5000,
        },
      );

      const data = response.data as NominatimReverseResponse;
      if (!data?.address?.country_code) {
        return this.createFallbackDetectionResult(lat, lng);
      }

      const countryCode = data.address.country_code.toUpperCase();
      const countryName = data.address.country || '';
      const defaults =
        this.countryDefaultsService.getCountryDefaults(countryCode);

      if (!defaults) {
        this.logger.warn(`Unsupported country detected: ${countryCode}`);
        return this.createFallbackDetectionResult(lat, lng);
      }

      const administrativeInfo = {
        province: data.address.state || data.address.province || '',
        district: data.address.county || data.address.district || '',
        city: data.address.city || data.address.town || '',
      };

      return {
        countryCode,
        countryName,
        confidence: 0.85,
        source: 'coordinates',
        coordinates: { lat, lng },
        administrativeInfo,
        defaults,
      };
    } catch (error: unknown) {
      this.logger.warn(
        `International location detection failed: ${ErrorUtilService.getErrorMessage(error)}`,
      );
      return this.createFallbackDetectionResult(lat, lng);
    }
  }

  /**
   * Create fallback detection result when other methods fail
   */
  private createFallbackDetectionResult(
    lat: number,
    lng: number,
    assumedCountryCode?: string,
  ): CountryDetectionResult {
    const countryCode = assumedCountryCode || 'US'; // Default fallback
    const defaults =
      this.countryDefaultsService.getCountryDefaults(countryCode)!;

    return {
      countryCode,
      countryName: this.getCountryName(countryCode),
      confidence: 0.3,
      source: 'fallback',
      coordinates: { lat, lng },
      defaults,
    };
  }

  /**
   * Get Vietnamese region based on coordinates
   */
  private getVietnameseRegion(lat: number): VietnamRegionInfo {
    if (lat >= 20.0) {
      return this.vietnamRegions.north;
    } else if (lat >= 11.0) {
      return this.vietnamRegions.central;
    } else {
      return this.vietnamRegions.south;
    }
  }

  /**
   * Get budget recommendations for a country
   */
  private async getBudgetRecommendations(countryCode: string) {
    const defaults =
      this.countryDefaultsService.getCountryDefaults(countryCode);
    const budget =
      this.budgetRecommendations[countryCode] ||
      this.budgetRecommendations.DEFAULT;

    // Get currency symbol from CurrencyService if available
    let currencySymbol = defaults?.currency || 'USD';
    try {
      // Try to get proper currency formatting from CurrencyService
      await this.currencyService.getExchangeRates('USD', [
        defaults?.currency || 'USD',
      ]);
      currencySymbol = defaults?.currency || 'USD';
    } catch (error) {
      this.logger.warn(
        `Failed to get currency info: ${ErrorUtilService.getErrorMessage(error)}`,
      );
    }

    return {
      currency: defaults?.currency || 'USD',
      averageDailyBudget: budget,
      currencySymbol,
    };
  }

  /**
   * Get comprehensive travel insights
   */
  private getTravelInsights(countryCode: string, lat: number) {
    const defaults =
      this.countryDefaultsService.getCountryDefaults(countryCode);
    const isVietnamDestination = countryCode === 'VN';

    let vietnamSpecificInfo:
      | {
          region: 'north' | 'central' | 'south';
          popularProvinces: string[];
          recommendedDuration: string;
        }
      | undefined;
    if (isVietnamDestination) {
      const regionInfo = this.getVietnameseRegion(lat);
      vietnamSpecificInfo = {
        region: regionInfo.region,
        popularProvinces: regionInfo.popularProvinces,
        recommendedDuration: regionInfo.recommendedDuration,
      };
    }

    return {
      bestTimeToVisit: this.getBestTimeToVisit(countryCode),
      timeZone: defaults?.timezone || 'UTC',
      language: defaults?.language || 'en',
      isVietnamDestination,
      vietnamSpecificInfo,
    };
  }

  /**
   * Get best time to visit for a country
   */
  private getBestTimeToVisit(countryCode: string): string[] {
    const seasonalRecommendations: Record<string, string[]> = {
      VN: ['October', 'November', 'December', 'January', 'February', 'March'],
      TH: ['November', 'December', 'January', 'February', 'March'],
      JP: ['March', 'April', 'May', 'September', 'October', 'November'],
      SG: ['February', 'March', 'April', 'May', 'September', 'October'],
      MY: ['March', 'April', 'May', 'September', 'October'],
      ID: ['May', 'June', 'July', 'August', 'September'],
      PH: ['December', 'January', 'February', 'March', 'April', 'May'],
      // Europe
      GB: ['May', 'June', 'July', 'August', 'September'],
      FR: ['April', 'May', 'June', 'July', 'August', 'September'],
      DE: ['May', 'June', 'July', 'August', 'September'],
      IT: ['April', 'May', 'June', 'July', 'August', 'September', 'October'],
      ES: ['April', 'May', 'June', 'July', 'August', 'September', 'October'],
      // Default
      DEFAULT: ['March', 'April', 'May', 'September', 'October', 'November'],
    };

    return (
      seasonalRecommendations[countryCode] || seasonalRecommendations.DEFAULT
    );
  }

  /**
   * Check if currency is supported by CurrencyService
   */
  private async checkCurrencySupport(currency: string): Promise<boolean> {
    try {
      const rates = await this.currencyService.getExchangeRates('USD', [
        currency,
      ]);
      return rates.rates[currency] !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Get country name from country code
   */
  private getCountryName(countryCode: string): string {
    const countryNames: Record<string, string> = {
      VN: 'Vietnam',
      TH: 'Thailand',
      JP: 'Japan',
      SG: 'Singapore',
      MY: 'Malaysia',
      ID: 'Indonesia',
      PH: 'Philippines',
      KR: 'South Korea',
      CN: 'China',
      IN: 'India',
      AU: 'Australia',
      NZ: 'New Zealand',
      GB: 'United Kingdom',
      FR: 'France',
      DE: 'Germany',
      IT: 'Italy',
      ES: 'Spain',
      US: 'United States',
      CA: 'Canada',
      MX: 'Mexico',
    };

    return countryNames[countryCode] || countryCode;
  }
}
