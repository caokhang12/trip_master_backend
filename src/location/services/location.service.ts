import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { VietnamLocationEntity } from '../../schemas/vietnam-location.entity';
import { DestinationEntity } from '../../schemas/destination.entity';
import { APIThrottleService } from '../../shared/services/api-throttle.service';
import { CacheService } from '../../shared/services/cache.service';
import { GoongApiService, GoongPlace } from './goong-api.service';
import { NominatimApiService, NominatimPlace } from './nominatim-api.service';
import { VietnamDetectorUtil } from '../../shared/utils/vietnam-detector.util';
import { PaginationUtilService } from '../../shared/utils/pagination.util';
import { ErrorUtilService } from '../../shared/utils/error.util';
import { PaginationResult } from '../../shared/types/pagination.types';
import {
  SearchStrategy,
  LocationSource,
  LocationType,
  SmartLocation,
  SmartLocationSearchResponse,
  LocationCoordinates,
  ReverseGeocodeResult,
  BulkSearchResponse,
  VietnamDetectionResult,
  VietnameseRegion,
  PointOfInterest,
} from '../interfaces/smart-location.interface';
import {
  LocationSearchDto,
  ReverseGeocodeDto,
  BulkLocationSearchDto,
  POISearchDto,
} from '../dto/location.dto';

/**
 * Location Service - Consolidates all location functionality
 * Implements intelligent API routing with Vietnam-first optimization
 */
@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    @InjectRepository(VietnamLocationEntity)
    private readonly vietnamLocationRepository: Repository<VietnamLocationEntity>,
    @InjectRepository(DestinationEntity)
    private readonly destinationRepository: Repository<DestinationEntity>,
    private readonly configService: ConfigService,
    private readonly apiThrottleService: APIThrottleService,
    private readonly cacheService: CacheService,
    private readonly goongApiService: GoongApiService,
    private readonly nominatimApiService: NominatimApiService,
  ) {}

  /**
   * Unified location search with intelligent routing
   * Replaces both basic and smart search functionality
   * Optimized to eliminate duplicate Vietnamese detection and improve performance
   */
  async searchLocations(
    searchDto: LocationSearchDto,
  ): Promise<SmartLocationSearchResponse> {
    const startTime = Date.now();
    const searchId = this.generateSearchId();
    this.logger.log(`[${searchId}] Starting search for: "${searchDto.query}"`);

    try {
      // Single Vietnamese detection call - used throughout the function
      const vietnamDetection = this.detectVietnamese(
        searchDto.query,
        searchDto.userCountry,
      );
      this.logger.debug(
        `[${searchId}] Vietnam detection: ${JSON.stringify(vietnamDetection)}`,
      );

      // Determine search strategy using pre-computed Vietnamese detection
      const strategy = this.determineSearchStrategyWithDetection(
        searchDto,
        vietnamDetection,
      );
      this.logger.debug(`[${searchId}] Using strategy: ${strategy}`);

      // Build comprehensive cache key including all relevant parameters
      const cacheKey = this.buildComprehensiveCacheKey(
        searchDto,
        vietnamDetection,
      );
      const cachedResults = this.cacheService.getSearchResults(cacheKey) as
        | SmartLocation[]
        | null;

      // Handle cache hit with centralized response building
      if (cachedResults && !searchDto.excludeCache) {
        const searchTime = Date.now() - startTime;
        this.logger.debug(
          `[${searchId}] Found ${cachedResults.length} cached results`,
        );
        return this.buildOptimizedSearchResponse(
          cachedResults,
          {
            searchTimeMs: searchTime,
            strategyUsed: strategy,
            sourcesAttempted: [LocationSource.CACHE],
            sourcesWithResults: [LocationSource.CACHE],
            cache: {
              hit: true,
              key: cacheKey,
              ttl: this.determineCacheTTL(vietnamDetection),
            },
            vietnamDetection,
          },
          true,
        );
      }

      // Execute search based on strategy
      const searchResult = await this.executeSearch(
        searchDto,
        strategy,
        searchId,
      );

      // Apply filters and sorting
      const filteredResults = this.applyFiltersAndSorting(
        searchResult.results,
        searchDto,
      );

      // Calculate search time and build response using centralized builder
      const searchTime = Date.now() - startTime;
      const response = this.buildOptimizedSearchResponse(
        filteredResults,
        {
          searchTimeMs: searchTime,
          strategyUsed: strategy,
          sourcesAttempted: searchResult.sourcesAttempted,
          sourcesWithResults: searchResult.sourcesWithResults,
          cache: { hit: false },
          vietnamDetection,
          apiUsage: searchResult.apiUsage,
          errors: searchResult.errors,
        },
        false,
      );

      // Cache successful results with dynamic TTL
      if (response.results.length > 0) {
        this.cacheSearchResultsWithTTL(
          cacheKey,
          response.results,
          vietnamDetection,
        );
      }

      this.logger.log(
        `[${searchId}] Search completed in ${searchTime}ms with ${response.results.length} results`,
      );
      return response;
    } catch (error) {
      const searchTime = Date.now() - startTime;
      this.logger.error(
        `[${searchId}] Search failed after ${searchTime}ms: ${ErrorUtilService.getErrorMessage(error)}`,
        ErrorUtilService.getErrorStack(error),
      );
      throw new HttpException(
        `Location search failed: ${ErrorUtilService.getErrorMessage(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Reverse geocoding with smart API selection
   */
  async reverseGeocode(
    reverseDto: ReverseGeocodeDto,
  ): Promise<ReverseGeocodeResult> {
    const startTime = Date.now();
    const { lat, lng, zoom = 10 } = reverseDto;
    this.logger.debug(`Reverse geocoding coordinates: ${lat}, ${lng}`);

    try {
      // Check cache first
      const cached = this.cacheService.getCachedReverseGeocode(lat, lng);
      if (cached) {
        return cached as ReverseGeocodeResult;
      }

      // Check if coordinates are in Vietnam
      const isInVietnam = VietnamDetectorUtil.isInVietnameseTerritory(lat, lng);

      let location: SmartLocation;
      let source: LocationSource = LocationSource.NOMINATIM;
      let confidence: number = 0.5;

      if (isInVietnam && this.goongApiService.isAvailable()) {
        // Use Goong for Vietnamese coordinates
        try {
          const goongResult = await this.goongApiService.reverseGeocode(
            lat,
            lng,
          );
          source = LocationSource.GOONG;
          // Convert GoongReverseResult to GoongPlace format for conversion
          const goongPlace: GoongPlace = {
            place_id: goongResult.place_id,
            name: goongResult.formatted_address.split(',')[0] || 'Unknown',
            formatted_address: goongResult.formatted_address,
            geometry: goongResult.geometry,
            types: goongResult.types,
            address_components: goongResult.address_components,
            compound: goongResult.compound,
          };
          const convertedLocation = this.convertToSmartLocation(
            goongPlace,
            source,
          );
          if (convertedLocation) {
            location = convertedLocation;
            confidence = this.calculateGoongConfidence(goongPlace);
            this.logger.debug('Used Goong API for Vietnam coordinates');
          } else {
            this.logger.warn(
              'Goong place conversion returned null, falling back to Nominatim',
            );
            throw new Error('Invalid Goong place without coordinates');
          }
        } catch (error) {
          this.logger.warn(
            `Goong reverse geocoding failed, falling back to Nominatim: ${ErrorUtilService.getErrorMessage(error)}`,
          );
          const nominatimResult = await this.nominatimApiService.reverseGeocode(
            lat,
            lng,
            {
              zoom,
            },
          );
          if (nominatimResult) {
            location = nominatimResult;
            confidence = nominatimResult.importance || 0.5;
          } else {
            throw new HttpException(
              'No location found for coordinates',
              HttpStatus.NOT_FOUND,
            );
          }
        }
      } else {
        // Use Nominatim for international coordinates
        const nominatimResult = await this.nominatimApiService.reverseGeocode(
          lat,
          lng,
          {
            zoom,
          },
        );
        if (nominatimResult) {
          location = nominatimResult;
          confidence = nominatimResult.importance || 0.5;
        } else {
          throw new HttpException(
            'No location found for coordinates',
            HttpStatus.NOT_FOUND,
          );
        }
      }

      const searchTime = Date.now() - startTime;
      const response = {
        location,
        metadata: {
          source,
          confidence,
          zoom,
          searchTimeMs: searchTime,
        },
      };

      // Cache the result
      this.cacheService.cacheReverseGeocode(lat, lng, response);
      return response;
    } catch (error) {
      this.logger.error(
        `Reverse geocoding failed: ${ErrorUtilService.getErrorMessage(error)}`,
        ErrorUtilService.getErrorStack(error),
      );
      throw new HttpException(
        'Reverse geocoding failed',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Bulk location search with parallel processing
   */
  async bulkSearch(
    bulkDto: BulkLocationSearchDto,
  ): Promise<BulkSearchResponse> {
    const startTime = Date.now();
    const {
      queries,
      userCountry,
      strategy = SearchStrategy.AUTO,
      limitPerQuery = 5,
    } = bulkDto;

    this.logger.log(`Starting bulk search for ${queries.length} queries`);

    try {
      const searchPromises = queries.map(async (query) => {
        try {
          const searchDto: LocationSearchDto = {
            query,
            userCountry,
            strategy,
            limit: limitPerQuery,
          };
          const result = await this.searchLocations(searchDto);
          return { query, results: result.results, success: true };
        } catch (error) {
          this.logger.warn(
            `Bulk search failed for query "${query}": ${ErrorUtilService.getErrorMessage(error)}`,
          );
          return {
            query,
            results: [],
            success: false,
            error: ErrorUtilService.getErrorMessage(error),
          };
        }
      });

      const searchResults = await Promise.all(searchPromises);
      const totalTime = Date.now() - startTime;

      // Organize results
      const results: Record<string, SmartLocation[]> = {};
      const errors: Record<string, string> = {};
      let successfulQueries = 0;

      searchResults.forEach(
        ({ query, results: queryResults, success, error }) => {
          results[query] = queryResults;
          if (success) {
            successfulQueries++;
          } else if (error) {
            errors[query] = error;
          }
        },
      );

      return {
        results,
        metadata: {
          totalQueries: queries.length,
          successfulQueries,
          failedQueries: queries.length - successfulQueries,
          totalSearchTimeMs: totalTime,
          strategyUsed: strategy,
          errors,
        },
      };
    } catch (error) {
      this.logger.error(
        `Bulk search failed: ${ErrorUtilService.getErrorMessage(error)}`,
        ErrorUtilService.getErrorStack(error),
      );
      throw new HttpException(
        'Bulk location search failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Search for Points of Interest near coordinates
   */
  async searchPOI(
    poiDto: POISearchDto,
  ): Promise<PaginationResult<PointOfInterest>> {
    const { lat, lng, category = 'all', radius = 5000, limit = 20 } = poiDto;
    this.logger.debug(
      `Searching POIs near ${lat},${lng}, category: ${category}`,
    );

    try {
      // Check if coordinates are in Vietnam for API selection
      const isInVietnam = VietnamDetectorUtil.isInVietnameseTerritory(lat, lng);
      let results: PointOfInterest[] = [];

      // TODO: Implement Goong POI search later
      // Temporarily commented out Goong API logic
      /*
      if (isInVietnam && this.goongApiService.isAvailable()) {
        // Use Goong for Vietnamese POIs
        try {
          const goongResults = await this.goongApiService.searchPlaces(
            `${category} near ${lat},${lng}`,
            {
              location: { lat, lng },
              radius,
              limit,
            },
          );
          results = goongResults.map((place) => this.convertGoongToPOI(place));
        } catch (error) {
          this.logger.warn(
            `Goong POI search failed: ${ErrorUtilService.getErrorMessage(error)}`,
          );
        }
      }
      */

      this.logger.debug(
        `POI search using Nominatim API only (Goong temporarily disabled, isInVietnam: ${isInVietnam})`,
      );

      // Use Nominatim for POI search
      if (results.length === 0) {
        const nominatimResults = await this.nominatimApiService.searchPOI(
          lat,
          lng,
          category,
          radius,
          limit,
        );
        results = nominatimResults.map((place) =>
          this.convertNominatimToPOI(place),
        );
      }

      return PaginationUtilService.createPaginationResult(results, {
        page: 1,
        limit,
        total: results.length,
      });
    } catch (error) {
      this.logger.error(
        `POI search failed: ${ErrorUtilService.getErrorMessage(error)}`,
      );
      throw new HttpException(
        'POI search failed',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Get location suggestions for autocomplete
   */
  async getLocationSuggestions(
    query: string,
    limit: number = 5,
  ): Promise<string[]> {
    try {
      // Get suggestions from Vietnamese database first
      const vietnameseSuggestions = await this.getVietnameseSuggestions(
        query,
        limit,
      );

      if (vietnameseSuggestions.length >= limit) {
        return vietnameseSuggestions.slice(0, limit);
      }

      // Supplement with cached search results if needed
      const remaining = limit - vietnameseSuggestions.length;
      const cachedSuggestions = this.getCachedSuggestions(query, remaining);
      return [...vietnameseSuggestions, ...cachedSuggestions].slice(0, limit);
    } catch (error) {
      this.logger.warn(
        `Failed to get suggestions: ${ErrorUtilService.getErrorMessage(error)}`,
      );
      return [];
    }
  }

  /**
   * Get Vietnamese administrative regions
   */
  async getVietnameseRegions(): Promise<any[]> {
    try {
      const cachedProvinces = await this.vietnamLocationRepository.find({
        where: { districtId: IsNull(), wardId: IsNull() },
        order: { provinceName: 'ASC' },
      });

      return cachedProvinces.map((entity) => ({
        id: entity.id,
        name: entity.provinceName,
        slug: entity.provinceName.toLowerCase().replace(/\s+/g, '-'),
        type: 'province',
        nameWithType: entity.fullName,
        code: entity.provinceId?.toString() || '',
        coordinates: this.parseCoordinates(entity.coordinates || ''),
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch Vietnamese regions: ${ErrorUtilService.getErrorMessage(error)}`,
      );
      throw new HttpException(
        'Unable to fetch Vietnamese regions',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // Private helper methods
  private determineSearchStrategy(
    searchDto: LocationSearchDto,
  ): SearchStrategy {
    if (searchDto.strategy && searchDto.strategy !== SearchStrategy.AUTO) {
      return searchDto.strategy;
    }

    // Detect if query is Vietnamese
    const vietnamDetection = this.detectVietnamese(
      searchDto.query,
      searchDto.userCountry,
    );

    if (vietnamDetection.isVietnamese && vietnamDetection.confidence > 0.7) {
      return SearchStrategy.VIETNAM_FIRST;
    }

    if (searchDto.userCountry === 'VN') {
      return SearchStrategy.VIETNAM_FIRST;
    }

    return SearchStrategy.INTERNATIONAL_FIRST;
  }

  /**
   * Optimized version that accepts pre-computed Vietnamese detection
   * Eliminates duplicate Vietnamese detection calls
   */
  private determineSearchStrategyWithDetection(
    searchDto: LocationSearchDto,
    vietnamDetection: VietnamDetectionResult,
  ): SearchStrategy {
    if (searchDto.strategy && searchDto.strategy !== SearchStrategy.AUTO) {
      return searchDto.strategy;
    }

    if (vietnamDetection.isVietnamese && vietnamDetection.confidence > 0.7) {
      return SearchStrategy.VIETNAM_FIRST;
    }

    if (searchDto.userCountry === 'VN') {
      return SearchStrategy.VIETNAM_FIRST;
    }

    return SearchStrategy.INTERNATIONAL_FIRST;
  }

  /**
   * Build comprehensive cache key including all relevant parameters
   * Improves cache hit rates by including Vietnamese detection results
   */
  private buildComprehensiveCacheKey(
    searchDto: LocationSearchDto,
    vietnamDetection: VietnamDetectionResult,
  ): string {
    const parts = [
      'search',
      encodeURIComponent(searchDto.query.toLowerCase().trim()),
      searchDto.strategy || 'AUTO',
      String(searchDto.limit || 10),
      searchDto.userCountry || 'DEFAULT',
      searchDto.locationType || 'ALL',
      String(searchDto.minImportance || 0),
      vietnamDetection.isVietnamese ? 'VN_TRUE' : 'VN_FALSE',
      String(Math.round(vietnamDetection.confidence * 100)),
    ];

    // Include user location if provided
    if (searchDto.userLocation) {
      parts.push(`lat_${searchDto.userLocation.lat.toFixed(2)}`);
      parts.push(`lng_${searchDto.userLocation.lng.toFixed(2)}`);
    }

    return parts.join(':');
  }

  /**
   * Centralized response building for both cached and fresh results
   * Eliminates duplicate response construction logic
   */
  private buildOptimizedSearchResponse(
    results: SmartLocation[],
    metadata: {
      searchTimeMs: number;
      strategyUsed: SearchStrategy;
      sourcesAttempted: LocationSource[];
      sourcesWithResults: LocationSource[];
      cache: { hit: boolean; key?: string; ttl?: number };
      vietnamDetection: VietnamDetectionResult;
      apiUsage?: Record<string, any>;
      errors?: any[];
    },
    isFromCache: boolean = false,
  ): SmartLocationSearchResponse {
    // Add cache-specific reasoning to Vietnamese detection
    const enhancedVietnamDetection = {
      ...metadata.vietnamDetection,
      reasoning: [
        ...metadata.vietnamDetection.reasoning,
        `Result source: ${isFromCache ? 'cache' : 'fresh search'}`,
        `Cache hit rate optimization: ${isFromCache ? 'improved' : 'baseline'}`,
      ],
    };

    return {
      results,
      metadata: {
        searchTimeMs: metadata.searchTimeMs,
        strategyUsed: metadata.strategyUsed,
        sourcesAttempted: metadata.sourcesAttempted,
        sourcesWithResults: metadata.sourcesWithResults,
        cache: metadata.cache,
        vietnamDetection: enhancedVietnamDetection,
        apiUsage: metadata.apiUsage,
        errors: metadata.errors,
      },
      totalResults: results.length,
      returnedResults: results.length,
      hasMore: false,
    };
  }

  /**
   * Dynamic TTL calculation based on content type
   * Vietnamese locations get longer TTL as they're more stable
   */
  private determineCacheTTL(vietnamDetection: VietnamDetectionResult): number {
    if (vietnamDetection.isVietnamese && vietnamDetection.confidence > 0.8) {
      return 7200; // 2 hours for Vietnamese locations (more stable)
    }
    return 1800; // 30 minutes for international locations (more dynamic)
  }

  /**
   * Cache search results with dynamic TTL based on content type
   */
  private cacheSearchResultsWithTTL(
    cacheKey: string,
    results: SmartLocation[],
    vietnamDetection: VietnamDetectionResult,
  ): void {
    const ttl = this.determineCacheTTL(vietnamDetection);
    this.cacheService.setSearchResults(cacheKey, results, ttl);
    this.logger.debug(`Cached ${results.length} results with ${ttl}s TTL`);
  }

  private async executeSearch(
    searchDto: LocationSearchDto,
    strategy: SearchStrategy,
    searchId: string,
  ): Promise<{
    results: SmartLocation[];
    sourcesAttempted: LocationSource[];
    sourcesWithResults: LocationSource[];
    apiUsage: Record<string, any>;
    errors: any[];
  }> {
    const sourcesAttempted: LocationSource[] = [];
    const sourcesWithResults: LocationSource[] = [];
    const apiUsage: Record<string, any> = {};
    const errors: any[] = [];
    let results: SmartLocation[] = [];

    switch (strategy) {
      case SearchStrategy.VIETNAM_ONLY:
        results = await this.searchVietnameseOnly(
          searchDto,
          sourcesAttempted,
          sourcesWithResults,
          errors,
          searchId,
        );
        break;
      case SearchStrategy.INTERNATIONAL_ONLY:
        results = await this.searchInternationalOnly(
          searchDto,
          sourcesAttempted,
          sourcesWithResults,
          errors,
          searchId,
        );
        break;
      case SearchStrategy.VIETNAM_FIRST:
        results = await this.searchVietnameseFirst(
          searchDto,
          sourcesAttempted,
          sourcesWithResults,
          errors,
          searchId,
        );
        break;
      case SearchStrategy.INTERNATIONAL_FIRST:
        results = await this.searchInternationalFirst(
          searchDto,
          sourcesAttempted,
          sourcesWithResults,
          errors,
          searchId,
        );
        break;
      default:
        results = await this.searchVietnameseFirst(
          searchDto,
          sourcesAttempted,
          sourcesWithResults,
          errors,
          searchId,
        );
    }

    return { results, sourcesAttempted, sourcesWithResults, apiUsage, errors };
  }

  private async searchVietnameseOnly(
    searchDto: LocationSearchDto,
    sourcesAttempted: LocationSource[],
    sourcesWithResults: LocationSource[],
    errors: any[],
    searchId: string,
  ): Promise<SmartLocation[]> {
    let results: SmartLocation[] = [];

    // Search database first
    sourcesAttempted.push(LocationSource.DATABASE);
    try {
      const dbResults = await this.searchVietnameseDatabase(
        searchDto.query,
        searchDto.limit || 10,
      );
      if (dbResults.length > 0) {
        results = dbResults;
        sourcesWithResults.push(LocationSource.DATABASE);
        this.logger.debug(
          `[${searchId}] Found ${dbResults.length} results in Vietnamese database`,
        );
      }
    } catch (error) {
      errors.push({
        service: 'database',
        error: ErrorUtilService.getErrorMessage(error),
      });
    }

    // TODO: Implement Goong API integration later
    // Temporarily commented out Goong API logic due to coordinate fetching issues
    /*
    // Try Goong API if no results from database
    if (results.length === 0 && this.goongApiService.isAvailable()) {
      sourcesAttempted.push(LocationSource.GOONG);
      try {
        const goongResults = await this.goongApiService.searchPlaces(
          searchDto.query,
          {
            limit: searchDto.limit || 10,
          },
        );
        if (goongResults.length > 0) {
          const smartLocations = goongResults
            .map((place) => this.convertGoongToSmartLocation(place))
            .filter((location): location is SmartLocation => location !== null);

          if (smartLocations.length > 0) {
            results = smartLocations;
            sourcesWithResults.push(LocationSource.GOONG);
            this.logger.debug(
              `[${searchId}] Found ${smartLocations.length} valid results from Goong API (${goongResults.length} total, ${goongResults.length - smartLocations.length} filtered out for missing coordinates)`,
            );
          } else {
            this.logger.debug(
              `[${searchId}] All ${goongResults.length} Goong API results filtered out due to missing coordinates`,
            );
          }
        }
      } catch (error) {
        errors.push({
          service: 'goong',
          error: ErrorUtilService.getErrorMessage(error),
        });
      }
    }
    */

    this.logger.debug(
      `[${searchId}] Goong API temporarily disabled - using database and fallback to Nominatim only`,
    );

    return results;
  }

  private async searchInternationalOnly(
    searchDto: LocationSearchDto,
    sourcesAttempted: LocationSource[],
    sourcesWithResults: LocationSource[],
    errors: any[],
    searchId: string,
  ): Promise<SmartLocation[]> {
    let results: SmartLocation[] = [];

    sourcesAttempted.push(LocationSource.NOMINATIM);
    try {
      const nominatimResults = await this.nominatimApiService.searchPlaces(
        searchDto.query,
        {
          limit: searchDto.limit || 10,
          countrycodes: searchDto.userCountry?.toLowerCase(),
        },
      );
      if (nominatimResults.length > 0) {
        results = nominatimResults; // Already SmartLocation[]
        sourcesWithResults.push(LocationSource.NOMINATIM);
        this.logger.debug(
          `[${searchId}] Found ${nominatimResults.length} results from Nominatim API`,
        );
      }
    } catch (error) {
      errors.push({
        service: 'nominatim',
        error: ErrorUtilService.getErrorMessage(error),
      });
    }

    return results;
  }

  private async searchVietnameseFirst(
    searchDto: LocationSearchDto,
    sourcesAttempted: LocationSource[],
    sourcesWithResults: LocationSource[],
    errors: any[],
    searchId: string,
  ): Promise<SmartLocation[]> {
    // Try Vietnamese sources first
    let results = await this.searchVietnameseOnly(
      searchDto,
      sourcesAttempted,
      sourcesWithResults,
      errors,
      searchId,
    );

    // Fallback to international if no results
    if (results.length === 0) {
      const internationalResults = await this.searchInternationalOnly(
        searchDto,
        sourcesAttempted,
        sourcesWithResults,
        errors,
        searchId,
      );
      results = internationalResults;
    }

    return results;
  }

  private async searchInternationalFirst(
    searchDto: LocationSearchDto,
    sourcesAttempted: LocationSource[],
    sourcesWithResults: LocationSource[],
    errors: any[],
    searchId: string,
  ): Promise<SmartLocation[]> {
    // Try international sources first
    let results = await this.searchInternationalOnly(
      searchDto,
      sourcesAttempted,
      sourcesWithResults,
      errors,
      searchId,
    );

    // Fallback to Vietnamese if no results
    if (results.length === 0) {
      const vietnameseResults = await this.searchVietnameseOnly(
        searchDto,
        sourcesAttempted,
        sourcesWithResults,
        errors,
        searchId,
      );
      results = vietnameseResults;
    }

    return results;
  }

  private async searchVietnameseDatabase(
    query: string,
    limit: number,
  ): Promise<SmartLocation[]> {
    const vietnamLocations = await this.vietnamLocationRepository
      .createQueryBuilder('vl')
      .where('LOWER(vl.full_name) LIKE LOWER(:query)', { query: `%${query}%` })
      .orWhere('LOWER(vl.province_name) LIKE LOWER(:query)', {
        query: `%${query}%`,
      })
      .orWhere('LOWER(vl.district_name) LIKE LOWER(:query)', {
        query: `%${query}%`,
      })
      .orderBy('vl.province_name', 'ASC')
      .limit(limit)
      .getMany();

    return vietnamLocations.map((entity) =>
      this.convertVietnamEntityToSmartLocation(entity),
    );
  }

  private detectVietnamese(
    query: string,
    userCountry?: string,
  ): VietnamDetectionResult {
    const result = VietnamDetectorUtil.detectVietnameseLocation(
      query,
      userCountry,
    );
    return {
      ...result,
      reasoning: [
        `Query analyzed for Vietnamese content: "${query}"`,
        `User country: ${userCountry || 'unknown'}`,
        `Confidence score: ${result.confidence}`,
        `Detected keywords: ${result.detectedKeywords.join(', ') || 'none'}`,
        `Result: ${result.isVietnamese ? 'Vietnamese' : 'Non-Vietnamese'}`,
      ],
    };
  }

  private applyFiltersAndSorting(
    results: SmartLocation[],
    searchDto: LocationSearchDto,
  ): SmartLocation[] {
    this.logger.debug(
      `Applying filters to ${results.length} results with minImportance: ${searchDto.minImportance}, locationType: ${searchDto.locationType}`,
    );

    let filteredResults = results;

    // Log initial results details
    this.logger.debug(
      'Initial results before filtering:',
      results.map((r) => ({
        id: r.id,
        name: r.name,
        importance: r.importance,
        placeType: r.placeType,
      })),
    );

    // TEMPORARILY DISABLED: Apply importance filter for testing API calls
    // TODO: Re-enable after fixing minImportance filtering logic
    /*
    if (searchDto.minImportance !== undefined) {
      const beforeCount = filteredResults.length;
      filteredResults = filteredResults.filter(
        (result) => result.importance >= searchDto.minImportance!,
      );
      this.logger.debug(
        `Importance filter: ${beforeCount} -> ${filteredResults.length} (threshold: ${searchDto.minImportance})`,
      );
    }
    */

    // Log that importance filtering is disabled
    this.logger.debug(
      `⚠️  IMPORTANCE FILTERING DISABLED FOR TESTING - All ${filteredResults.length} results will be included`,
    );

    // Apply location type filter
    if (searchDto.locationType && searchDto.locationType !== LocationType.ALL) {
      const beforeCount = filteredResults.length;
      filteredResults = this.filterByLocationType(
        filteredResults,
        searchDto.locationType,
      );
      this.logger.debug(
        `Location type filter: ${beforeCount} -> ${filteredResults.length} (type: ${searchDto.locationType})`,
      );
    }

    // Sort by importance and distance
    filteredResults.sort((a, b) => {
      const importanceDiff = b.importance - a.importance;
      if (Math.abs(importanceDiff) > 0.1) {
        return importanceDiff;
      }
      if (
        searchDto.userLocation &&
        a.distanceFromUser !== undefined &&
        b.distanceFromUser !== undefined
      ) {
        return a.distanceFromUser - b.distanceFromUser;
      }
      return 0;
    });

    return filteredResults.slice(0, searchDto.limit || 10);
  }

  private filterByLocationType(
    results: SmartLocation[],
    type: string,
  ): SmartLocation[] {
    const typeMapping: Record<string, string[]> = {
      cities: ['city', 'town', 'municipality'],
      provinces: ['state', 'province', 'region'],
      districts: ['district', 'county'],
      tourist_attractions: ['tourism', 'attraction', 'monument'],
      airports: ['airport', 'aerodrome'],
      landmarks: ['landmark', 'point_of_interest'],
    };

    const validTypes = typeMapping[type] || [];
    if (validTypes.length === 0) {
      return results;
    }

    return results.filter((result) =>
      validTypes.some((validType) =>
        result.placeType.toLowerCase().includes(validType.toLowerCase()),
      ),
    );
  }

  private buildSearchResponse(
    results: SmartLocation[],
    metadata: Partial<{
      searchTimeMs: number;
      strategyUsed: SearchStrategy;
      sourcesAttempted: LocationSource[];
      sourcesWithResults: LocationSource[];
      cache: { hit: boolean; key?: string; ttl?: number };
      vietnamDetection: VietnamDetectionResult;
      apiUsage?: Record<string, any>;
      errors?: any[];
    }>,
  ): SmartLocationSearchResponse {
    return {
      results,
      metadata: {
        searchTimeMs: metadata.searchTimeMs || 0,
        strategyUsed: metadata.strategyUsed || SearchStrategy.AUTO,
        sourcesAttempted: metadata.sourcesAttempted || [],
        sourcesWithResults: metadata.sourcesWithResults || [],
        cache: metadata.cache || { hit: false },
        vietnamDetection: metadata.vietnamDetection || {
          isVietnamese: false,
          confidence: 0,
          detectedKeywords: [],
          reasoning: ['No Vietnam detection available'],
        },
        apiUsage: metadata.apiUsage,
        errors: metadata.errors,
      },
      totalResults: results.length,
      returnedResults: results.length,
      hasMore: false,
    };
  }

  // Conversion helper methods
  private convertGoongToSmartLocation(place: GoongPlace): SmartLocation | null {
    // Skip places without valid coordinates
    if (
      !place.geometry?.location?.lat ||
      !place.geometry?.location?.lng ||
      place.geometry.location.lat === 0 ||
      place.geometry.location.lng === 0
    ) {
      this.logger.debug(
        `Skipping Goong place without valid coordinates: ${place.name} (${place.place_id})`,
      );
      return null;
    }

    return {
      id: place.place_id || `goong_${Date.now()}`,
      name: place.name || 'Unknown',
      displayName: place.formatted_address || place.name || 'Unknown',
      coordinates: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
      country: 'Vietnam',
      countryCode: 'VN',
      province: this.goongApiService.extractProvince(place),
      district: this.goongApiService.extractDistrict(place),
      ward: this.goongApiService.extractWard(place),
      address: place.formatted_address || '',
      placeType: place.types?.[0] || 'place',
      source: LocationSource.GOONG,
      importance: this.calculateImportanceFromGoong(place),
      vietnamRegion: VietnamDetectorUtil.getRegionFromCoordinates(
        place.geometry.location.lat,
        place.geometry.location.lng,
      ) as VietnameseRegion | undefined,
    };
  }

  private convertNominatimToSmartLocation(
    place: NominatimPlace,
  ): SmartLocation {
    const placeName =
      place.name ||
      (place.display_name ? place.display_name.split(',')[0] : null) ||
      'Unknown';
    return {
      id: place.place_id?.toString() || `nominatim_${Date.now()}`,
      name: placeName,
      displayName: place.display_name || 'Unknown',
      coordinates: {
        lat: parseFloat(place.lat || '0'),
        lng: parseFloat(place.lon || '0'),
      },
      country: this.nominatimApiService.extractCountry(place) || '',
      countryCode: this.nominatimApiService.extractCountryCode(place) || '',
      province: this.nominatimApiService.extractAdministrativeArea(place),
      district: this.nominatimApiService.extractDistrict(place),
      address: place.display_name || '',
      placeType: place.type || place.class || 'place',
      source: LocationSource.NOMINATIM,
      importance: place.importance || 0.5,
      administrative: {
        country: this.nominatimApiService.extractCountry(place),
        province: this.nominatimApiService.extractAdministrativeArea(place),
        district: this.nominatimApiService.extractDistrict(place),
      },
    };
  }

  private convertVietnamEntityToSmartLocation(
    entity: VietnamLocationEntity,
  ): SmartLocation {
    const coordinates = this.parseCoordinates(entity.coordinates || '');
    return {
      id: entity.id,
      name: entity.provinceName,
      displayName: entity.fullName,
      coordinates,
      country: 'Vietnam',
      countryCode: 'VN',
      province: entity.provinceName,
      district: entity.districtName,
      address: entity.fullName,
      placeType: 'administrative',
      source: LocationSource.DATABASE,
      importance: 0.8,
      vietnamRegion: (() => {
        const region = VietnamDetectorUtil.getRegionFromCoordinates(
          coordinates.lat,
          coordinates.lng,
        );
        return region ? (region as VietnameseRegion) : undefined;
      })(),
      administrative: {
        country: 'Vietnam',
        province: entity.provinceName,
        district: entity.districtName,
      },
    };
  }

  private convertToSmartLocation(
    result: GoongPlace | NominatimPlace | VietnamLocationEntity,
    source: LocationSource,
  ): SmartLocation | null {
    switch (source) {
      case LocationSource.GOONG:
        return this.convertGoongToSmartLocation(result as GoongPlace);
      case LocationSource.NOMINATIM:
        return this.convertNominatimToSmartLocation(result as NominatimPlace);
      case LocationSource.DATABASE:
        return this.convertVietnamEntityToSmartLocation(
          result as VietnamLocationEntity,
        );
      default:
        throw new Error(`Unknown source: ${source}`);
    }
  }

  private convertGoongToPOI(place: GoongPlace): PointOfInterest {
    return {
      id: place.place_id || `goong_poi_${Date.now()}`,
      name: place.name || 'Unknown',
      category: place.types?.[0] || 'establishment',
      coordinates: {
        lat: place.geometry?.location?.lat || 0,
        lng: place.geometry?.location?.lng || 0,
      },
      address: place.formatted_address || '',
      rating: 0, // Not available in basic GoongPlace
      reviews: 0, // Not available in basic GoongPlace
      source: LocationSource.GOONG,
    };
  }

  private convertNominatimToPOI(place: NominatimPlace): PointOfInterest {
    return {
      id: place.place_id?.toString() || `nominatim_poi_${Date.now()}`,
      name: place.name || place.display_name?.split(',')[0] || 'Unknown',
      category: place.type || place.class || 'establishment',
      coordinates: {
        lat: parseFloat(place.lat || '0'),
        lng: parseFloat(place.lon || '0'),
      },
      address: place.display_name || '',
      rating: 0,
      reviews: 0,
      source: LocationSource.NOMINATIM,
    };
  }

  // Utility methods
  private calculateConfidence(result: any, source: LocationSource): number {
    switch (source) {
      case LocationSource.GOONG:
        return this.calculateGoongConfidence(result as GoongPlace);
      case LocationSource.NOMINATIM:
        return (result as NominatimPlace).importance || 0.5;
      case LocationSource.DATABASE:
        return 0.9;
      default:
        return 0.5;
    }
  }

  private calculateGoongConfidence(place: GoongPlace): number {
    let confidence = 0.5;
    if (place.types?.includes('locality')) confidence += 0.2;
    if (place.types?.includes('administrative_area_level_1')) confidence += 0.2;
    if (place.types?.includes('administrative_area_level_2')) confidence += 0.1;
    if (place.formatted_address) confidence += 0.1;
    return Math.min(confidence, 1.0);
  }

  private calculateImportanceFromGoong(place: GoongPlace): number {
    let importance = 0.5;
    if (place.types?.includes('locality')) importance = 0.8;
    if (place.types?.includes('administrative_area_level_1')) importance = 0.9;
    if (place.types?.includes('country')) importance = 1.0;
    if (place.types?.includes('tourist_attraction')) importance = 0.7;
    if (place.types?.includes('airport')) importance = 0.8;
    return importance;
  }

  private mapCategoryToGoongType(category: string): string {
    const mapping: Record<string, string> = {
      restaurant: 'restaurant',
      hotel: 'lodging',
      attraction: 'tourist_attraction',
      shopping: 'shopping_mall',
      hospital: 'hospital',
      gas_station: 'gas_station',
      bank: 'bank',
      atm: 'atm',
      all: '',
    };
    return mapping[category] || category;
  }

  private async getVietnameseSuggestions(
    query: string,
    limit: number,
  ): Promise<string[]> {
    try {
      const locations = await this.vietnamLocationRepository
        .createQueryBuilder('vl')
        .select('vl.provinceName', 'name')
        .where('LOWER(vl.provinceName) LIKE LOWER(:query)', {
          query: `%${query}%`,
        })
        .orWhere('LOWER(vl.districtName) LIKE LOWER(:query)', {
          query: `%${query}%`,
        })
        .groupBy('vl.provinceName')
        .orderBy('vl.provinceName', 'ASC')
        .limit(limit)
        .getRawMany();

      return locations.map((loc: { name: string }) => loc.name);
    } catch (error) {
      this.logger.warn(
        `Failed to get Vietnamese suggestions: ${ErrorUtilService.getErrorMessage(error)}`,
      );
      return [];
    }
  }

  private getCachedSuggestions(query: string, limit: number): string[] {
    // This could be implemented to get suggestions from cached search results
    // For now, return empty array since it's not implemented
    // TODO: Implement caching logic using query and limit parameters
    void query; // Suppress unused parameter warning
    void limit; // Suppress unused parameter warning
    return [];
  }

  private generateSearchId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private buildCacheKey(searchDto: LocationSearchDto): string {
    // Legacy cache key format for backward compatibility
    return `search:${searchDto.query}:${searchDto.strategy || 'AUTO'}:${searchDto.limit || 10}:${searchDto.userCountry || 'DEFAULT'}`;
  }

  private cacheSearchResults(cacheKey: string, results: SmartLocation[]): void {
    // Legacy caching method with fixed TTL for backward compatibility
    this.cacheService.setSearchResults(cacheKey, results, 3600); // 1 hour TTL
  }

  private parseCoordinates(coords: string): LocationCoordinates {
    try {
      const match = coords.match(/POINT\(([^)]+)\)/);
      if (match) {
        const [lng, lat] = match[1].split(' ').map(Number);
        return { lat, lng };
      }
      return { lat: 0, lng: 0 };
    } catch {
      return { lat: 0, lng: 0 };
    }
  }

  // REMOVED LEGACY METHODS:
  // - searchLocation() - use searchLocations() instead
  // - getSuggestions() - use getLocationSuggestions() instead
  // - getVietnameseProvinces() - use getVietnameseRegions() instead
}
