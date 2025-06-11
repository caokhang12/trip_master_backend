import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { APIThrottleService } from '../../shared/services/api-throttle.service';
import { CacheService } from '../../shared/services/cache.service';
import {
  LocationSource,
  SmartLocation,
} from '../interfaces/smart-location.interface';

/**
 * Nominatim search options interface
 */
export interface NominatimSearchOptions {
  limit?: number;
  countrycodes?: string;
  countryCode?: string; // Added for compatibility
  viewbox?: string;
  bounded?: boolean;
  addressdetails?: boolean;
  extratags?: boolean;
  namedetails?: boolean;
  dedupe?: boolean;
  polygon_geojson?: boolean;
  zoom?: number;
  language?: string;
  types?: string; // Added for compatibility
  boundingBox?: {
    // Added for compatibility
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  };
}

/**
 * Nominatim reverse geocoding options interface
 */
export interface NominatimReverseOptions {
  zoom?: number;
  language?: string;
  addressdetails?: boolean;
  extratags?: boolean;
  namedetails?: boolean;
  polygon_geojson?: boolean;
}

/**
 * Nominatim address interface
 */
export interface NominatimAddress {
  country?: string;
  country_code?: string;
  state?: string;
  region?: string;
  province?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  county?: string;
  district?: string;
  municipality?: string;
  postcode?: string;
  road?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  attraction?: string; // Added
}

/**
 * Nominatim place interface
 */
export interface NominatimPlace {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  category?: string;
  class?: string;
  type: string;
  place_rank?: number;
  importance?: number;
  addresstype?: string;
  name?: string;
  display_name: string;
  address?: NominatimAddress;
  boundingbox?: string[];
  geojson?: any;
  extratags?: Record<string, string>;
  namedetails?: Record<string, string>;
  icon?: string; // Added
}

/**
 * Nominatim reverse geocoding result interface
 */
export interface NominatimReverseResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  category?: string;
  class?: string;
  type: string;
  place_rank?: number;
  importance?: number;
  addresstype?: string;
  name?: string;
  display_name: string;
  address?: NominatimAddress;
  boundingbox?: string[];
  extratags?: Record<string, string>;
  namedetails?: Record<string, string>;
  icon?: string; // Added
}

/**
 * Nominatim API Service for international location searches using OpenStreetMap data
 */
@Injectable()
export class NominatimApiService {
  private readonly logger = new Logger(NominatimApiService.name);
  private readonly baseUrl: string = 'https://nominatim.openstreetmap.org';

  constructor(
    private readonly apiThrottleService: APIThrottleService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Search for places using Nominatim API
   */
  async searchPlaces(
    query: string,
    options: NominatimSearchOptions = {},
  ): Promise<SmartLocation[]> {
    this.logger.debug(`Searching Nominatim places for: ${query}`);

    // Prepare search options with defaults
    const searchOptions: NominatimSearchOptions = {
      limit: options.limit || 10,
      dedupe: options.dedupe !== false,
      addressdetails: true,
      extratags: true,
      namedetails: true,
      ...options,
    };

    try {
      // Check API throttling before cache check
      if (!this.apiThrottleService.checkAndLog('nominatim')) {
        throw new HttpException(
          'Nominatim API rate limit exceeded',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Check cache after rate limiting check
      const cacheKey = this.generateCacheKey('search', {
        query,
        ...searchOptions,
      });
      const cachedResult = this.cacheService.get(cacheKey);

      if (cachedResult) {
        this.logger.debug('Returning cached Nominatim search results');
        return cachedResult;
      }

      const params = this.buildSearchParams(query, searchOptions);
      const response: AxiosResponse<NominatimPlace[]> = await axios.get(
        `${this.baseUrl}/search`,
        {
          params,
          headers: {
            'User-Agent': 'TripMaster/1.0',
          },
        },
      );

      // Validate response is array
      if (!Array.isArray(response.data)) {
        this.logger.warn('Nominatim API returned non-array response');
        return [];
      }

      // Transform Nominatim places to SmartLocation
      const smartLocations = response.data
        .filter((place) => place && place.lat && place.lon)
        .map((place) => this.transformToSmartLocation(place));

      // Cache successful results
      this.cacheService.set(cacheKey, smartLocations, 300); // 5 minutes TTL

      this.logger.debug(
        `Found ${smartLocations.length} Nominatim places for: ${query}`,
      );

      return smartLocations;
    } catch (error) {
      if (this.isRateLimitError(error)) {
        throw new HttpException(
          'Nominatim API rate limit exceeded',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      this.logger.error(
        `Error searching Nominatim places for "${query}":`,
        error instanceof Error ? error.message : String(error),
      );

      throw new HttpException(
        'Failed to search places',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get place details by OSM ID
   */
  async getPlaceDetails(
    osmId: number,
    osmType: string = 'way',
  ): Promise<SmartLocation | null> {
    this.logger.debug(`Getting Nominatim place details for OSM ID: ${osmId}`);

    // Return null for invalid OSM IDs instead of throwing exception
    if (osmId <= 0) {
      return null;
    }

    // Check cache first
    const cacheKey = this.generateCacheKey('details', { osmId, osmType });
    const cachedResult = this.cacheService.get(cacheKey);

    if (cachedResult) {
      this.logger.debug('Returning cached Nominatim place details');
      return cachedResult;
    }

    try {
      // Check API throttling before making request
      if (!this.apiThrottleService.checkAndLog('nominatim')) {
        throw new HttpException(
          'Nominatim API rate limit exceeded',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Convert osmType to expected format: "way" -> "W", "node" -> "N", "relation" -> "R"
      const osmTypeMap: Record<string, string> = {
        way: 'W',
        node: 'N',
        relation: 'R',
      };
      const mappedOsmType = osmTypeMap[osmType.toLowerCase()] || osmType;

      const params = {
        osmtype: mappedOsmType,
        osmid: osmId,
        addressdetails: 1,
        extratags: 1,
        namedetails: 1,
        format: 'json',
      };

      const response: AxiosResponse<NominatimReverseResult> = await axios.get(
        `${this.baseUrl}/details`,
        {
          params,
          headers: {
            'User-Agent': 'TripMaster/1.0',
          },
        },
      );

      if (!response.data) {
        return null; // Return null instead of throwing exception
      }

      // Transform to SmartLocation
      const smartLocation = this.transformToSmartLocation(response.data);

      // Cache successful results
      this.cacheService.set(cacheKey, smartLocation, 600); // 10 minutes TTL

      this.logger.debug(`Retrieved place details for OSM ID: ${osmId}`);

      return smartLocation;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Error getting place details for OSM ID ${osmId}:`,
        error instanceof Error ? error.message : String(error),
      );

      throw new HttpException(
        'Failed to get place details',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Reverse geocode coordinates to get location information
   */
  async reverseGeocode(
    lat: number,
    lng: number,
    options: NominatimReverseOptions = {},
  ): Promise<SmartLocation | null> {
    this.logger.debug(`Reverse geocoding coordinates: ${lat}, ${lng}`);

    // Validate coordinates
    if (!this.isValidCoordinate(lat, lng)) {
      throw new HttpException(
        'Invalid coordinates provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check cache first
    const cacheKey = this.generateCacheKey('reverse', { lat, lng, ...options });
    const cachedResult = this.cacheService.get(cacheKey);

    if (cachedResult) {
      this.logger.debug('Returning cached reverse geocoding result');
      return cachedResult;
    }

    try {
      // Check API throttling before making request
      if (!this.apiThrottleService.checkAndLog('nominatim')) {
        throw new HttpException(
          'Nominatim API rate limit exceeded',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const params = {
        lat: lat, // Keep as number to match test expectations
        lon: lng, // Keep as number to match test expectations
        format: 'json',
        addressdetails: 1,
        extratags: 1,
        namedetails: 1,
        zoom: options.zoom || 18,
        'accept-language': options.language || 'en',
      };

      const response: AxiosResponse<NominatimReverseResult> = await axios.get(
        `${this.baseUrl}/reverse`,
        {
          params,
          headers: {
            'User-Agent': 'TripMaster/1.0',
          },
        },
      );

      if (!response.data) {
        return null; // Return null instead of throwing exception
      }

      // Transform to SmartLocation
      const smartLocation = this.transformToSmartLocation(response.data);

      // Cache successful results
      this.cacheService.set(cacheKey, smartLocation, 7200); // 2 hours TTL

      this.logger.debug(`Reverse geocoded coordinates: ${lat}, ${lng}`);

      return smartLocation;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Error reverse geocoding coordinates ${lat}, ${lng}:`,
        error instanceof Error ? error.message : String(error),
      );

      return null; // Return null instead of throwing exception
    }
  }

  /**
   * Search for Points of Interest (POI) near coordinates
   */
  async searchPOI(
    lat: number,
    lng: number,
    category: string,
    radius: number = 1000,
    limit: number = 10,
  ): Promise<NominatimPlace[]> {
    this.logger.debug(
      `Searching POI near ${lat}, ${lng} for category: ${category}`,
    );

    // Validate coordinates
    if (!this.isValidCoordinate(lat, lng)) {
      throw new HttpException(
        'Invalid coordinates provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check cache first
    const cacheKey = this.generateCacheKey('poi', {
      lat,
      lng,
      category,
      radius,
      limit,
    });
    const cachedResult = this.cacheService.get(cacheKey);

    if (cachedResult) {
      this.logger.debug('Returning cached POI search results');
      return cachedResult;
    }

    try {
      // Calculate bounding box from radius
      const boundingBox = this.calculateBoundingBox(lat, lng, radius);

      const params = {
        q: category,
        format: 'json',
        addressdetails: 1,
        extratags: 1,
        namedetails: 1,
        limit: limit,
        viewbox: `${boundingBox.west},${boundingBox.north},${boundingBox.east},${boundingBox.south}`,
        bounded: 1,
      };

      const response: AxiosResponse<NominatimPlace[]> = await axios.get(
        `${this.baseUrl}/search`,
        {
          params,
          headers: {
            'User-Agent': 'TripMaster/1.0',
          },
        },
      );

      // Validate response is array
      if (!Array.isArray(response.data)) {
        this.logger.warn(
          'Nominatim API returned non-array response for POI search',
        );
        return [];
      }

      // Filter results within radius
      const filteredResults = response.data.filter((place) => {
        if (!place.lat || !place.lon) return false;
        const distance = this.calculateDistance(
          lat,
          lng,
          parseFloat(place.lat),
          parseFloat(place.lon),
        );
        return distance <= radius;
      });

      // Cache successful results
      this.cacheService.set(cacheKey, filteredResults, 300); // 5 minutes TTL

      this.logger.debug(
        `Found ${filteredResults.length} POI near ${lat}, ${lng}`,
      );

      return filteredResults;
    } catch (error) {
      this.logger.error(
        `Error searching POI near ${lat}, ${lng}:`,
        error instanceof Error ? error.message : String(error),
      );

      throw new HttpException(
        'Failed to search POI',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Transform Nominatim place/result to SmartLocation format
   */
  private transformToSmartLocation(
    place: NominatimPlace | NominatimReverseResult,
  ): SmartLocation {
    const location: SmartLocation = {
      id: `nominatim_${place.osm_id || place.place_id}`,
      name: this.extractName(place),
      displayName: place.display_name || this.extractName(place),
      coordinates: {
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
      },
      country: this.extractCountry(place) || '',
      countryCode: this.extractCountryCode(place) || '',
      province: this.extractProvince(place),
      district: this.extractDistrict(place),
      ward: this.extractWard(place),
      address: place.display_name || '',
      placeType: place.type || place.category || 'unknown',
      source: LocationSource.NOMINATIM,
      importance: place.importance || 0,
      administrative: place.address
        ? {
            country: this.extractCountry(place) || '',
            state: place.address.state || place.address.county || '',
            city:
              place.address.city ||
              place.address.town ||
              place.address.village ||
              '',
            road: place.address.road || '',
            neighbourhood:
              place.address.neighbourhood || place.address.suburb || '',
            suburb: place.address.suburb || '',
          }
        : undefined,
      metadata: {
        osm_id: place.osm_id,
        osm_type: place.osm_type,
        place_id: place.place_id,
        class: place.class || place.category, // Use 'class' field directly from place
        type: place.type,
        importance: place.importance,
        place_rank: place.place_rank,
        boundingbox: place.boundingbox,
        extratags: place.extratags,
        namedetails: place.namedetails,
        ...(place.extratags || {}),
      },
    };

    return location;
  }

  /**
   * Extract name from Nominatim place
   */
  public extractName(place: NominatimPlace | NominatimReverseResult): string {
    // Priority order for name extraction
    if (place.name) return place.name;
    if (place.address?.attraction) return place.address.attraction;
    if (place.address?.road) return place.address.road;
    if (place.namedetails?.name) return place.namedetails.name;

    // Extract first part of display_name as fallback
    const displayParts = place.display_name.split(',');
    return displayParts[0]?.trim() || 'Unnamed Location';
  }

  /**
   * Extract country from address
   */
  public extractCountry(
    place: NominatimPlace | NominatimReverseResult,
  ): string | undefined {
    return place.address?.country;
  }

  /**
   * Extract country code from address
   */
  public extractCountryCode(
    place: NominatimPlace | NominatimReverseResult,
  ): string | undefined {
    return place.address?.country_code?.toUpperCase();
  }

  /**
   * Extract administrative area (state/region) from address
   */
  public extractAdministrativeArea(
    place: NominatimPlace | NominatimReverseResult,
  ): string | undefined {
    return place.address?.state || place.address?.region;
  }

  /**
   * Extract province from address
   */
  private extractProvince(
    place: NominatimPlace | NominatimReverseResult,
  ): string | undefined {
    return (
      place.address?.province || place.address?.state || place.address?.region
    );
  }

  /**
   * Extract city from address
   */
  private extractCity(
    place: NominatimPlace | NominatimReverseResult,
  ): string | undefined {
    return (
      place.address?.city ||
      place.address?.town ||
      place.address?.village ||
      place.address?.hamlet
    );
  }

  /**
   * Extract district from address
   */
  public extractDistrict(
    place: NominatimPlace | NominatimReverseResult,
  ): string | undefined {
    return (
      place.address?.district ||
      place.address?.county ||
      place.address?.municipality
    );
  }

  /**
   * Extract ward from address
   */
  private extractWard(
    place: NominatimPlace | NominatimReverseResult,
  ): string | undefined {
    return (
      place.address?.suburb ||
      place.address?.neighbourhood ||
      place.address?.quarter
    );
  }

  /**
   * Build search parameters for Nominatim API
   */
  private buildSearchParams(
    query: string,
    options: NominatimSearchOptions,
  ): Record<string, string | number> {
    const params: Record<string, string | number> = {
      q: query,
      format: 'json',
      addressdetails: 1,
      extratags: 1,
      namedetails: 1,
    };

    // Only add limit if options has a limit
    if (options.limit !== undefined) {
      params.limit = options.limit;
    }

    // Add dedupe setting
    if (options.dedupe === false) {
      params.dedupe = 0;
    }

    // Add country codes if specified
    if (options.countrycodes || options.countryCode) {
      params.countrycodes = options.countrycodes || options.countryCode || '';
    }

    // Add bounding box if specified
    if (options.viewbox) {
      params.viewbox = options.viewbox;
      // Always add bounded=1 when viewbox is provided
      params.bounded = 1;
    } else if (options.boundingBox) {
      const { minLat, minLng, maxLat, maxLng } = options.boundingBox;
      params.viewbox = `${minLng},${maxLat},${maxLng},${minLat}`;
      params.bounded = 1;
    }

    // Add language if specified
    if (options.language) {
      params['accept-language'] = options.language;
    }

    // Add types/class if specified
    if (options.types) {
      params.class = options.types;
    }

    // Add polygon geometry if requested
    if (options.polygon_geojson) {
      params.polygon_geojson = 1;
    }

    return params;
  }

  /**
   * Generate cache key for API requests
   */
  private generateCacheKey(
    operation: string,
    params: Record<string, any>,
  ): string {
    const sortedParams: Record<string, any> = {};

    Object.keys(params)
      .sort()
      .forEach((key) => {
        sortedParams[key] = params[key];
      });

    return `nominatim_${operation}_${JSON.stringify(sortedParams)}`;
  }

  /**
   * Check if error is rate limit related
   */
  private isRateLimitError(error: any): boolean {
    const axiosError = error as {
      response?: { status?: number };
      message?: string;
    };

    return (
      axiosError?.response?.status === 429 ||
      axiosError?.response?.status === 509 ||
      (typeof axiosError?.message === 'string' &&
        axiosError.message.includes('rate limit'))
    );
  }

  /**
   * Validate coordinate values
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
   * Calculate bounding box from center point and radius
   */
  private calculateBoundingBox(
    lat: number,
    lng: number,
    radiusMeters: number,
  ): {
    north: number;
    south: number;
    east: number;
    west: number;
  } {
    const earthRadius = 6371000; // Earth's radius in meters
    const latDelta = (radiusMeters / earthRadius) * (180 / Math.PI);
    const lngDelta =
      ((radiusMeters / earthRadius) * (180 / Math.PI)) /
      Math.cos((lat * Math.PI) / 180);

    return {
      north: lat + latDelta,
      south: lat - latDelta,
      east: lng + lngDelta,
      west: lng - lngDelta,
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
