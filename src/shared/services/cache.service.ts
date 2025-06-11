import { Injectable, Logger } from '@nestjs/common';

/**
 * Cache entry interface with TTL support
 */
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  keys: string[];
  hitRate: number;
}

/**
 * Cache service for location search results and API responses
 * Uses in-memory storage for development - should use Redis in production
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  // In-memory cache storage
  private cache: Map<string, CacheEntry> = new Map();

  // Cache statistics
  private stats = {
    hits: 0,
    misses: 0,
  };

  // Default TTL values in milliseconds
  private readonly DEFAULT_TTL = {
    SEARCH_RESULTS: 3600000, // 1 hour
    VIETNAMESE_PROVINCES: 86400000, // 24 hours
    REVERSE_GEOCODING: 21600000, // 6 hours
    API_RESPONSES: 1800000, // 30 minutes
    POPULAR_LOCATIONS: 43200000, // 12 hours
  };

  /**
   * Get cached value by key
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.logger.debug(`Cache expired for key: ${key}`);
      return null;
    }

    this.stats.hits++;
    this.logger.debug(`Cache hit for key: ${key}`);
    return entry.data as T;
  }

  /**
   * Set cache value with TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds (optional)
   */
  set<T = any>(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL.SEARCH_RESULTS,
    };

    this.cache.set(key, entry);
    this.logger.debug(`Cached value for key: ${key} with TTL: ${entry.ttl}ms`);
  }

  /**
   * Delete cache entry by key
   * @param key - Cache key to delete
   * @returns boolean indicating if key was found and deleted
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Deleted cache entry for key: ${key}`);
    }
    return deleted;
  }

  /**
   * Check if key exists and is not expired
   * @param key - Cache key to check
   * @returns boolean indicating if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cleared ${size} cache entries`);
  }

  /**
   * Clear expired entries
   * @returns number of entries cleared
   */
  clearExpired(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.log(`Cleared ${cleared} expired cache entries`);
    }

    return cleared;
  }

  /**
   * Get cache statistics
   * @returns CacheStats object
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: Array.from(this.cache.keys()),
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.logger.log('Cache statistics reset');
  }

  /**
   * Cache search results with appropriate TTL
   * @param query - Search query
   * @param results - Search results to cache
   * @param userCountry - Optional user country for cache key
   */
  cacheSearchResults(
    query: string,
    results: unknown[],
    userCountry?: string,
  ): void {
    const cacheKey = this.generateSearchCacheKey(query, userCountry);
    this.set(cacheKey, results, this.DEFAULT_TTL.SEARCH_RESULTS);
  }

  /**
   * Get cached search results
   * @param query - Search query
   * @param userCountry - Optional user country for cache key
   * @returns Cached search results or null
   */
  getCachedSearchResults(
    query: string,
    userCountry?: string,
  ): unknown[] | null {
    const cacheKey = this.generateSearchCacheKey(query, userCountry);
    return this.get<unknown[]>(cacheKey);
  }

  /**
   * Cache Vietnamese provinces/districts
   * @param key - Cache key (e.g., 'provinces', 'districts_1')
   * @param data - Data to cache
   */
  cacheVietnameseRegions(key: string, data: unknown): void {
    this.set(key, data, this.DEFAULT_TTL.VIETNAMESE_PROVINCES);
  }

  /**
   * Get cached Vietnamese regions
   * @param key - Cache key
   * @returns Cached region data or null
   */
  getCachedVietnameseRegions(key: string): unknown {
    return this.get(key);
  }

  /**
   * Cache reverse geocoding results
   * @param lat - Latitude
   * @param lng - Longitude
   * @param result - Geocoding result
   */
  cacheReverseGeocode(lat: number, lng: number, result: unknown): void {
    const cacheKey = `reverse_${lat.toFixed(3)}_${lng.toFixed(3)}`;
    this.set(cacheKey, result, this.DEFAULT_TTL.REVERSE_GEOCODING);
  }

  /**
   * Get cached reverse geocoding result
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Cached result or null
   */
  getCachedReverseGeocode(lat: number, lng: number): unknown {
    const cacheKey = `reverse_${lat.toFixed(3)}_${lng.toFixed(3)}`;
    return this.get(cacheKey);
  }

  /**
   * Cache API response with service-specific TTL
   * @param service - API service name
   * @param endpoint - API endpoint
   * @param params - API parameters
   * @param response - API response
   */
  cacheApiResponse(
    service: string,
    endpoint: string,
    params: unknown,
    response: unknown,
  ): void {
    const cacheKey = this.generateApiCacheKey(service, endpoint, params);
    this.set(cacheKey, response, this.DEFAULT_TTL.API_RESPONSES);
  }

  /**
   * Get cached API response
   * @param service - API service name
   * @param endpoint - API endpoint
   * @param params - API parameters
   * @returns Cached response or null
   */
  getCachedApiResponse(
    service: string,
    endpoint: string,
    params: unknown,
  ): unknown {
    const cacheKey = this.generateApiCacheKey(service, endpoint, params);
    return this.get(cacheKey);
  }

  /**
   * Get popular locations for autocomplete suggestions
   * @returns Array of popular location names
   */
  getPopularLocations(): string[] {
    const popularPrefix = 'popular_';
    const popularLocations: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(popularPrefix)) {
        const now = Date.now();
        if (now - entry.timestamp <= entry.ttl) {
          const locationData = entry.data as { location: string };
          popularLocations.push(locationData.location);
        }
      }
    }

    return popularLocations;
  }

  /**
   * Get cached search results by cache key
   * @param cacheKey - The cache key to retrieve
   * @returns Cached search results or null
   */
  getSearchResults(cacheKey: string): unknown[] | null {
    return this.get<unknown[]>(cacheKey);
  }

  /**
   * Set search results with cache key and TTL
   * @param cacheKey - The cache key to store under
   * @param results - Search results to cache
   * @param ttlSeconds - Time to live in seconds
   */
  setSearchResults(
    cacheKey: string,
    results: unknown[],
    ttlSeconds: number,
  ): void {
    const ttlMs = ttlSeconds * 1000;
    this.set(cacheKey, results, ttlMs);
  }

  /**
   * Generate search cache key
   * @param query - Search query
   * @param userCountry - Optional user country
   * @returns Cache key string
   */
  private generateSearchCacheKey(query: string, userCountry?: string): string {
    const normalizedQuery = query.toLowerCase().trim();
    const country = userCountry || 'global';
    return `search_${country}_${Buffer.from(normalizedQuery).toString('base64')}`;
  }

  /**
   * Generate API cache key
   * @param service - API service name
   * @param endpoint - API endpoint
   * @param params - API parameters
   * @returns Cache key string
   */
  private generateApiCacheKey(
    service: string,
    endpoint: string,
    params: unknown,
  ): string {
    const paramsStr = JSON.stringify(params);
    const paramsHash = Buffer.from(paramsStr).toString('base64');
    return `api_${service}_${endpoint}_${paramsHash}`;
  }

  /**
   * Warm cache with popular Vietnamese locations
   * This should be called during application startup
   */
  warmPopularLocations(): void {
    const popularLocations = [
      'Ho Chi Minh City',
      'Hanoi',
      'Da Nang',
      'Hue',
      'Hoi An',
      'Nha Trang',
      'Sapa',
      'Ha Long Bay',
      'Can Tho',
      'Phu Quoc',
      'Mui Ne',
      'Dalat',
    ];

    this.logger.log('Warming cache with popular Vietnamese locations');

    for (const location of popularLocations) {
      const cacheKey = `popular_${location.toLowerCase().replace(/\s/g, '_')}`;
      // Cache popular location for quick access
      this.set(
        cacheKey,
        { location, isPopular: true },
        this.DEFAULT_TTL.POPULAR_LOCATIONS,
      );
    }
  }
}
