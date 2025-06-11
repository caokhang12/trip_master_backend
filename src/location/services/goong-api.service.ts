import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { APIThrottleService } from '../../shared/services/api-throttle.service';
import { CacheService } from '../../shared/services/cache.service';

/**
 * Goong API search options interface
 */
export interface GoongSearchOptions {
  location?: { lat: number; lng: number };
  radius?: number;
  type?: string;
  limit?: number;
  language?: string;
}

/**
 * Goong AutoComplete API response structure
 */
export interface GoongAutocompletePlace {
  place_id: string;
  description: string;
  reference: string;
  structured_formatting?: {
    main_text: string;
    main_text_matched_substrings?: Array<{
      length: number;
      offset: number;
    }>;
    secondary_text: string;
    secondary_text_matched_substrings?: Array<{
      length: number;
      offset: number;
    }>;
  };
  matched_substrings?: Array<{
    length: number;
    offset: number;
  }>;
  terms?: Array<{
    offset: number;
    value: string;
  }>;
  types: string[];
  has_children?: boolean;
  plus_code?: {
    compound_code: string;
    global_code: string;
  };
  compound?: {
    district?: string;
    commune?: string;
    province?: string;
  };
  distance_meters?: number | null;
}

/**
 * Normalized Goong place result interface for internal use
 */
export interface GoongPlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  address_components?: GoongAddressComponent[];
  compound?: {
    district?: string;
    commune?: string;
    province?: string;
  };
  plus_code?: {
    compound_code: string;
    global_code: string;
  };
}

/**
 * Goong address component interface
 */
export interface GoongAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

/**
 * Goong place detail interface
 */
export interface GoongPlaceDetail extends GoongPlace {
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  opening_hours?: {
    open_now: boolean;
    periods: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
  };
  price_level?: number;
  website?: string;
  phone?: string;
}

/**
 * Goong reverse geocoding result interface
 */
export interface GoongReverseResult {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id: string;
  address_components: GoongAddressComponent[];
  compound?: {
    district?: string;
    commune?: string;
    province?: string;
  };
  types: string[];
}

/**
 * Goong AutoComplete API response interface
 */
interface GoongAutocompleteResponse {
  predictions: GoongAutocompletePlace[];
  status: string;
  error_message?: string;
}

/**
 * Goong API response interface for other endpoints
 */
interface GoongApiResponse<T> {
  results: T[];
  status: string;
  error_message?: string;
}

/**
 * Goong API service for Vietnam-specific location searches
 * Integrates with Goong Maps API for accurate Vietnamese location data
 */
@Injectable()
export class GoongApiService {
  private readonly logger = new Logger(GoongApiService.name);
  private readonly baseUrl = 'https://rsapi.goong.io';
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly apiThrottleService: APIThrottleService,
    private readonly cacheService: CacheService,
  ) {
    this.apiKey = this.configService.get<string>('GOONG_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn(
        'GOONG_API_KEY not configured - Goong API will not be available',
      );
    }
  }

  /**
   * Search for places using Goong API
   * @param query - Search query string
   * @param options - Search options
   * @returns Array of GoongPlace results
   */
  async searchPlaces(
    query: string,
    options: GoongSearchOptions = {},
  ): Promise<GoongPlace[]> {
    if (!this.apiKey) {
      this.logger.error('Goong API key not configured');
      throw new HttpException(
        'Goong API key not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!query || query.trim().length === 0) {
      this.logger.debug('Empty query provided to Goong API');
      return [];
    }

    this.logger.debug(`Searching places with Goong API: "${query}"`);
    this.logger.debug(
      `Goong API key present: ${!!this.apiKey} (length: ${this.apiKey.length})`,
    );

    // Check rate limits
    const canUseApi = this.apiThrottleService.checkAndLog('goong');
    if (!canUseApi) {
      this.logger.warn('Goong API rate limit exceeded');
      throw new HttpException(
        'Goong API rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check cache first
    const cachedResult = this.cacheService.getCachedApiResponse(
      'goong',
      'search',
      { query, ...options },
    ) as GoongPlace[] | null;

    if (cachedResult) {
      this.logger.debug(
        `Returning cached Goong search results: ${cachedResult.length} results`,
      );
      return cachedResult;
    }

    try {
      const params = this.buildSearchParams(query, options);
      this.logger.debug(`Goong API request params:`, params);

      const requestUrl = `${this.baseUrl}/Place/AutoComplete`;
      this.logger.debug(`Making request to: ${requestUrl}`);

      const response: AxiosResponse<GoongAutocompleteResponse> =
        await axios.get(requestUrl, {
          params,
          timeout: 10000,
          headers: {
            'User-Agent': 'TripMaster/1.0',
          },
        });

      this.logger.debug(`Goong API response status: ${response.status}`);
      this.logger.debug(`Goong API response data:`, {
        status: response.data.status,
        resultCount: response.data.predictions?.length || 0,
        errorMessage: response.data.error_message,
        fullResponse: response.data,
      });

      if (response.data.status !== 'OK') {
        this.logger.error(
          `Goong API error: ${response.data.status} - ${response.data.error_message}`,
        );
        throw new HttpException(
          `Goong API error: ${response.data.error_message || response.data.status}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const rawResults = response.data.predictions || [];

      this.logger.debug(`Raw Goong results for "${query}":`, {
        resultCount: rawResults.length,
        results: rawResults.map((place) => ({
          place_id: place.place_id,
          description: place.description,
          types: place.types,
        })),
      });

      // Transform AutoComplete results to normalized GoongPlace format
      let results: GoongPlace[] = rawResults.map((place) =>
        this.transformAutocompletePlace(place),
      );

      this.logger.debug(`Transformed Goong results for "${query}":`, {
        resultCount: results.length,
        results: results.map((place) => ({
          place_id: place.place_id,
          name: place.name,
          formatted_address: place.formatted_address,
          types: place.types,
        })),
      });

      // AutoComplete API doesn't provide geometry, so we need to fetch coordinates
      // for the first few results to make them usable
      const limitForCoordinates = Math.min(results.length, 3); // Only fetch coordinates for top 3 results to save API calls
      if (limitForCoordinates > 0) {
        this.logger.debug(
          `Fetching coordinates for top ${limitForCoordinates} Goong results`,
        );

        const resultsWithCoordinates = await Promise.allSettled(
          results.slice(0, limitForCoordinates).map(async (place) => {
            try {
              const placeDetails = await this.getPlaceDetails(place.place_id);
              return {
                ...place,
                geometry: placeDetails.geometry,
              };
            } catch (error) {
              this.logger.debug(
                `Failed to fetch coordinates for place ${place.place_id}: ${error.message}`,
              );
              return place; // Return original place without coordinates
            }
          }),
        );

        // Update results with coordinates where available
        resultsWithCoordinates.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.geometry) {
            results[index] = result.value;
          }
        });
      }

      this.logger.debug(`Goong results with coordinates for "${query}":`, {
        resultCount: results.length,
        resultsWithCoordinates: results.filter((r) => r.geometry).length,
        results: results.map((place) => ({
          place_id: place.place_id,
          name: place.name,
          formatted_address: place.formatted_address,
          types: place.types,
          hasGeometry: !!place.geometry,
          coordinates: place.geometry?.location,
        })),
      });

      // Cache the results
      this.cacheService.cacheApiResponse(
        'goong',
        'search',
        { query, ...options },
        results,
      );

      this.logger.debug(
        `Goong API returned ${results.length} results for query: "${query}"`,
      );
      return results;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(`Goong API axios error:`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
          code: error.code,
        });

        if (error.response?.status === 429) {
          throw new HttpException(
            'Goong API rate limit exceeded',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        this.logger.error(
          `Goong API request failed: ${error.message}`,
          error.stack,
        );
        throw new HttpException(
          `Goong API request failed: ${error.message}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Unexpected error during Goong API request: ${errorMessage}`,
        errorStack,
      );
      throw new HttpException(
        'Internal server error during location search',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get detailed information about a specific place
   * @param placeId - Goong place ID
   * @returns GoongPlaceDetail object
   */
  async getPlaceDetails(placeId: string): Promise<GoongPlaceDetail> {
    if (!this.apiKey) {
      throw new HttpException(
        'Goong API key not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!placeId) {
      throw new HttpException('Place ID is required', HttpStatus.BAD_REQUEST);
    }

    this.logger.debug(`Getting place details from Goong API: ${placeId}`);

    // Check rate limits
    const canUseApi = this.apiThrottleService.checkAndLog('goong');
    if (!canUseApi) {
      throw new HttpException(
        'Goong API rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check cache first
    const cachedResult = this.cacheService.getCachedApiResponse(
      'goong',
      'details',
      { placeId },
    ) as GoongPlaceDetail | null;

    if (cachedResult) {
      this.logger.debug('Returning cached Goong place details');
      return cachedResult;
    }

    try {
      const response: AxiosResponse<{
        result: GoongPlaceDetail;
        status: string;
        error_message?: string;
      }> = await axios.get(`${this.baseUrl}/Place/Detail`, {
        params: {
          place_id: placeId,
          api_key: this.apiKey,
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'TripMaster/1.0',
        },
      });

      if (response.data.status !== 'OK') {
        this.logger.error(
          `Goong API error: ${response.data.status} - ${response.data.error_message}`,
        );
        throw new HttpException(
          `Goong API error: ${response.data.error_message || response.data.status}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const result = response.data.result;

      // Cache the result
      this.cacheService.cacheApiResponse(
        'goong',
        'details',
        { placeId },
        result,
      );

      this.logger.debug(`Retrieved place details for: ${placeId}`);
      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new HttpException(
            'Goong API rate limit exceeded',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        this.logger.error(
          `Goong API request failed: ${error.message}`,
          error.stack,
        );
        throw new HttpException(
          `Goong API request failed: ${error.message}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Unexpected error during Goong API request: ${errorMessage}`,
        errorStack,
      );
      throw new HttpException(
        'Internal server error during place details retrieval',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Reverse geocoding to get address from coordinates
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns GoongReverseResult object
   */
  async reverseGeocode(lat: number, lng: number): Promise<GoongReverseResult> {
    if (!this.apiKey) {
      throw new HttpException(
        'Goong API key not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!this.isValidCoordinate(lat, lng)) {
      throw new HttpException(
        'Invalid coordinates provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.debug(`Reverse geocoding with Goong API: ${lat}, ${lng}`);

    // Check rate limits
    const canUseApi = this.apiThrottleService.checkAndLog('goong');
    if (!canUseApi) {
      throw new HttpException(
        'Goong API rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check cache first
    const cachedResult = this.cacheService.getCachedReverseGeocode(
      lat,
      lng,
    ) as { source: string; data: GoongReverseResult } | null;

    if (cachedResult && cachedResult.source === 'goong') {
      this.logger.debug('Returning cached Goong reverse geocoding result');
      return cachedResult.data;
    }

    try {
      const response: AxiosResponse<GoongApiResponse<GoongReverseResult>> =
        await axios.get(`${this.baseUrl}/Geocode`, {
          params: {
            latlng: `${lat},${lng}`,
            api_key: this.apiKey,
          },
          timeout: 10000,
          headers: {
            'User-Agent': 'TripMaster/1.0',
          },
        });

      if (response.data.status !== 'OK') {
        this.logger.error(
          `Goong API error: ${response.data.status} - ${response.data.error_message}`,
        );
        throw new HttpException(
          `Goong API error: ${response.data.error_message || response.data.status}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const results = response.data.results || [];
      if (results.length === 0) {
        throw new HttpException(
          'No results found for coordinates',
          HttpStatus.NOT_FOUND,
        );
      }

      const result = results[0];

      // Cache the result
      this.cacheService.cacheReverseGeocode(lat, lng, {
        source: 'goong',
        data: result,
      });

      this.logger.debug(
        `Reverse geocoding successful for coordinates: ${lat}, ${lng}`,
      );
      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new HttpException(
            'Goong API rate limit exceeded',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        this.logger.error(
          `Goong API request failed: ${error.message}`,
          error.stack,
        );
        throw new HttpException(
          `Goong API request failed: ${error.message}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Unexpected error during Goong API request: ${errorMessage}`,
        errorStack,
      );
      throw new HttpException(
        'Internal server error during reverse geocoding',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check if the Goong API is available and configured
   * @returns boolean indicating availability
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get API usage statistics
   * @returns API usage information
   */
  getUsageStats(): any {
    return this.apiThrottleService.getUsageStats('goong');
  }

  /**
   * Build search parameters for Goong API request
   * @param query - Search query
   * @param options - Search options
   * @returns API parameters object
   */
  private buildSearchParams(
    query: string,
    options: GoongSearchOptions,
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {
      input: query,
      api_key: this.apiKey,
      limit: options.limit || 10,
    };

    if (options.location) {
      params.location = `${options.location.lat},${options.location.lng}`;

      if (options.radius) {
        params.radius = Math.min(options.radius, 50000); // Max 50km radius
      }
    }

    if (options.type) {
      params.types = options.type;
    }

    if (options.language) {
      params.language = options.language;
    }

    this.logger.debug(`Built Goong search params:`, {
      input: params.input,
      api_key: params.api_key
        ? `${String(params.api_key).substring(0, 8)}...`
        : 'NOT_SET',
      limit: params.limit,
      location: params.location,
      radius: params.radius,
      types: params.types,
      language: params.language,
    });

    return params;
  }

  /**
   * Transform AutoComplete place to normalized GoongPlace format
   * @param place - Raw AutoComplete place data
   * @returns Normalized GoongPlace object
   */
  private transformAutocompletePlace(
    place: GoongAutocompletePlace,
  ): GoongPlace {
    return {
      place_id: place.place_id,
      name:
        place.structured_formatting?.main_text ||
        place.description ||
        'Unknown',
      formatted_address: place.description,
      types: place.types,
      compound: place.compound,
      plus_code: place.plus_code,
      // Note: AutoComplete API doesn't provide geometry,
      // would need to call Place Details API for coordinates
    };
  }

  /**
   * Generate cache key for API requests
   * @param endpoint - API endpoint
   * @param params - Request parameters
   * @returns Cache key string
   */
  private generateCacheKey(endpoint: string, params: any): string {
    const paramString = JSON.stringify(params);
    return `goong_${endpoint}_${Buffer.from(paramString).toString('base64')}`;
  }

  /**
   * Validate coordinates
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns boolean indicating if coordinates are valid
   */
  private isValidCoordinate(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      !isNaN(lat) &&
      !isNaN(lng)
    );
  }

  /**
   * Extract province from Goong result
   * @param place - Goong place result
   * @returns Province name or undefined
   */
  extractProvince(place: GoongPlace): string | undefined {
    // Check compound first (more reliable for Vietnam)
    if (place.compound?.province) {
      return place.compound.province;
    }

    // Fallback to address components
    const provinceComponent = place.address_components?.find(
      (component) =>
        component.types.includes('administrative_area_level_1') ||
        component.types.includes('locality'),
    );

    return provinceComponent?.long_name;
  }

  /**
   * Extract district from Goong result
   * @param place - Goong place result
   * @returns District name or undefined
   */
  extractDistrict(place: GoongPlace): string | undefined {
    // Check compound first
    if (place.compound?.district) {
      return place.compound.district;
    }

    // Fallback to address components
    const districtComponent = place.address_components?.find(
      (component) =>
        component.types.includes('administrative_area_level_2') ||
        component.types.includes('sublocality'),
    );

    return districtComponent?.long_name;
  }

  /**
   * Extract ward from Goong result
   * @param place - Goong place result
   * @returns Ward name or undefined
   */
  extractWard(place: GoongPlace): string | undefined {
    // Check compound first
    if (place.compound?.commune) {
      return place.compound.commune;
    }

    // Fallback to address components
    const wardComponent = place.address_components?.find(
      (component) =>
        component.types.includes('administrative_area_level_3') ||
        component.types.includes('sublocality_level_1'),
    );

    return wardComponent?.long_name;
  }
}
