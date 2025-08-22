import { Injectable, Logger } from '@nestjs/common';

/**
 * Cache entry interface with TTL support
 */
interface CacheEntry<T = any> {
  data: T;
  timestamp: number; // epoch ms
  ttl: number; // ms
  key: string; // original key (for potential adapters / debugging)
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
  maxEntries: number;
}

/**
 * Cache service for location search results and API responses
 * Uses in-memory storage for development - should use Redis in production
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  // In-memory cache storage (simple LRU via Map insertion order)
  private cache: Map<string, CacheEntry> = new Map();

  // Cache statistics
  private stats = {
    hits: 0,
    misses: 0,
  };

  // Default TTL values in milliseconds
  private readonly DEFAULT_TTL = {
    SEARCH_RESULTS: 60 * 60 * 1000, // 1h
    PLACE_SEARCH: 15 * 60 * 1000, // 15m (Google Places quick churn)
    REVERSE_GEOCODING: 6 * 60 * 60 * 1000, // 6h
    API_RESPONSES: 30 * 60 * 1000, // 30m
  } as const;

  // Soft cap to avoid unbounded growth (can tune later or move to config)
  private readonly MAX_ENTRIES = 1000;

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
    const effectiveTtl = ttl ?? this.DEFAULT_TTL.SEARCH_RESULTS;

    // Interpret ttl provided in seconds accidentally (legacy bug) if small value
    const resolvedTtl =
      effectiveTtl > 100000 ? effectiveTtl : effectiveTtl * 1000;

    const entry: CacheEntry<T> = {
      key,
      data: value,
      timestamp: Date.now(),
      ttl: resolvedTtl,
    };

    // Simple LRU eviction if exceeding max entries
    if (!this.cache.has(key) && this.cache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value as string | undefined;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    // Refresh insertion order (Map acts as access-order only if we delete+set)
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, entry);

    this.logger.debug(
      `Cached key: ${key} (ttl=${Math.round(resolvedTtl / 1000)}s)`,
    );
  }

  /**
   * Delete cache entry by key
   * @param key - Cache key to delete
   * @returns boolean indicating if key was found and deleted
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) this.logger.debug(`Cache delete: ${key}`);
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
    const expired = Date.now() - entry.timestamp > entry.ttl;
    if (expired) {
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
    this.logger.log(`Cache cleared (${size} entries removed)`);
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
    if (cleared > 0) this.logger.debug(`Expired entries purged: ${cleared}`);
    return cleared;
  }

  /**
   * Get cache statistics
   * @returns CacheStats object
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total ? this.stats.hits / total : 0;
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: Array.from(this.cache.keys()),
      hitRate: Math.round(hitRate * 100) / 100,
      maxEntries: this.MAX_ENTRIES,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.logger.debug('Cache statistics reset');
  }
  // ---- Specialized helpers (minimal set kept for future Google Places integration) ----

  /** Cache Google Places search results */
  cachePlacesSearch(query: string, results: unknown[]): void {
    const key = this.buildPlacesKey(query);
    this.set(key, results, this.DEFAULT_TTL.PLACE_SEARCH);
  }

  /** Retrieve cached Google Places search results */
  getCachedPlacesSearch<T = unknown[]>(query: string): T | null {
    const key = this.buildPlacesKey(query);
    return this.get<T>(key);
  }

  /** Build a normalized key for place searches */
  private buildPlacesKey(query: string): string {
    return `places_${Buffer.from(query.toLowerCase().trim()).toString('base64')}`;
  }
}
