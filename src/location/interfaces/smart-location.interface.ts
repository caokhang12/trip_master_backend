/**
 * Enhanced Location interfaces for Smart Destination Search
 * These interfaces provide a unified structure for location data across different APIs
 */

/**
 * Core location interface with enhanced properties
 */
export interface SmartLocation {
  id: string;
  name: string;
  displayName: string;
  coordinates: LocationCoordinates;
  country: string;
  countryCode: string;
  province?: string;
  district?: string;
  ward?: string;
  address: string;
  placeType: string;
  source: LocationSource;
  importance: number;
  distanceFromUser?: number;
  vietnamRegion?: VietnameseRegion;
  administrative?: AdministrativeHierarchy;
  metadata?: LocationMetadata;
  boundingBox?: BoundingBox;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Coordinate interface with enhanced validation
 */
export interface LocationCoordinates {
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
}

/**
 * Enhanced location source enum
 */
export enum LocationSource {
  DATABASE = 'database',
  GOONG = 'goong',
  NOMINATIM = 'nominatim',
  CACHE = 'cache',
  USER_INPUT = 'user_input',
  FALLBACK = 'fallback',
}

/**
 * Vietnamese region classification
 */
export type VietnameseRegion = 'North' | 'Central' | 'South';

/**
 * Administrative hierarchy interface
 */
export interface AdministrativeHierarchy {
  country?: string;
  province?: string;
  district?: string;
  ward?: string;
  commune?: string;
  neighborhood?: string;
  [key: string]: string | undefined;
}

/**
 * Location metadata interface
 */
export interface LocationMetadata {
  timezone?: string;
  population?: number;
  elevation?: number;
  areaCode?: string;
  postalCode?: string;
  website?: string;
  wikidata?: string;
  osm_id?: number;
  osm_type?: string;
  lastUpdated?: Date;
  [key: string]: any;
}

/**
 * Bounding box interface
 */
export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/**
 * Search strategy configuration interface
 */
export interface SearchStrategyConfig {
  strategy: SearchStrategy;
  vietnamFirst: boolean;
  enableFallback: boolean;
  useCache: boolean;
  sources: LocationSource[];
  timeout: number;
  retryCount: number;
}

/**
 * Search strategy enum
 */
export enum SearchStrategy {
  AUTO = 'auto',
  VIETNAM_ONLY = 'vietnam_only',
  INTERNATIONAL_ONLY = 'international_only',
  VIETNAM_FIRST = 'vietnam_first',
  INTERNATIONAL_FIRST = 'international_first',
}

/**
 * Location search options interface
 */
export interface LocationSearchOptions {
  query: string;
  userCountry?: string;
  userLocation?: LocationCoordinates;
  strategy?: SearchStrategy;
  locationType?: LocationType;
  limit?: number;
  minImportance?: number;
  language?: string;
  includeAdministrative?: boolean;
  includePOI?: boolean;
  excludeSources?: LocationSource[];
  bbox?: BoundingBox;
  radiusKm?: number;
}

/**
 * Location type enum
 */
export enum LocationType {
  ALL = 'all',
  CITIES = 'cities',
  PROVINCES = 'provinces',
  DISTRICTS = 'districts',
  TOURIST_ATTRACTIONS = 'tourist_attractions',
  AIRPORTS = 'airports',
  LANDMARKS = 'landmarks',
}

/**
 * Vietnam detection result interface
 */
export interface VietnamDetectionResult {
  isVietnamese: boolean;
  confidence: number;
  detectedKeywords: string[];
  detectedRegion?: VietnameseRegion;
  administrativeDivisions?: {
    province?: string;
    district?: string;
    ward?: string;
  };
  coordinates?: LocationCoordinates;
  reasoning: string[];
}

/**
 * API service interface for location searches
 */
export interface LocationApiService {
  searchPlaces(query: string, options?: any): Promise<any[]>;
  getPlaceDetails?(placeId: string): Promise<any>;
  reverseGeocode?(lat: number, lng: number): Promise<any>;
  isAvailable(): boolean;
  getUsageStats(): any;
}

/**
 * Cache entry interface for location data
 */
export interface LocationCacheEntry<T = any> {
  data: T;
  source: LocationSource;
  timestamp: Date;
  ttl: number;
  hits: number;
  lastAccessed: Date;
}

/**
 * Search result metadata interface
 */
export interface SearchResultMetadata {
  searchTimeMs: number;
  strategyUsed: SearchStrategy;
  sourcesAttempted: LocationSource[];
  sourcesWithResults: LocationSource[];
  cache: {
    hit: boolean;
    key?: string;
    ttl?: number;
  };
  vietnamDetection: VietnamDetectionResult;
  apiUsage?: Record<string, any>;
  errors?: ApiError[];
}

/**
 * API error interface
 */
export interface ApiError {
  service: string;
  error: string;
  statusCode?: number;
  timestamp: Date;
  retryable: boolean;
}

/**
 * Enhanced search response interface
 */
export interface SmartLocationSearchResponse {
  results: SmartLocation[];
  metadata: SearchResultMetadata;
  totalResults: number;
  returnedResults: number;
  hasMore: boolean;
  suggestions?: string[];
  relatedTerms?: string[];
}

/**
 * Reverse geocoding result interface
 */
export interface ReverseGeocodeResult {
  location: SmartLocation;
  metadata: {
    source: LocationSource;
    confidence: number;
    zoom: number;
    searchTimeMs: number;
  };
}

/**
 * POI (Point of Interest) interface
 */
export interface PointOfInterest {
  id: string;
  name: string;
  category: string;
  coordinates: LocationCoordinates;
  address: string;
  rating?: number;
  reviews?: number;
  priceLevel?: number;
  openingHours?: OpeningHours;
  photos?: Photo[];
  website?: string;
  phone?: string;
  source: LocationSource;
  distance?: number;
  metadata?: Record<string, any>;
}

/**
 * Opening hours interface
 */
export interface OpeningHours {
  isOpen?: boolean;
  periods?: OpeningPeriod[];
  weekday_text?: string[];
  special_days?: SpecialDay[];
}

/**
 * Opening period interface
 */
export interface OpeningPeriod {
  open: TimeOfDay;
  close?: TimeOfDay;
}

/**
 * Time of day interface
 */
export interface TimeOfDay {
  day: number; // 0 = Sunday, 1 = Monday, etc.
  time: string; // HHMM format
}

/**
 * Special day interface (holidays, etc.)
 */
export interface SpecialDay {
  date: string; // YYYY-MM-DD format
  isOpen: boolean;
  hours?: TimeOfDay[];
  description?: string;
}

/**
 * Photo interface
 */
export interface Photo {
  photoReference: string;
  width: number;
  height: number;
  attributions?: string[];
  url?: string;
}

/**
 * Location validation interface
 */
export interface LocationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Bulk search request interface
 */
export interface BulkSearchRequest {
  queries: string[];
  userCountry?: string;
  strategy?: SearchStrategy;
  limitPerQuery?: number;
  options?: Partial<LocationSearchOptions>;
}

/**
 * Bulk search response interface
 */
export interface BulkSearchResponse {
  results: Record<string, SmartLocation[]>;
  metadata: {
    totalQueries: number;
    successfulQueries: number;
    failedQueries: number;
    totalSearchTimeMs: number;
    strategyUsed: SearchStrategy;
    errors: Record<string, string>;
  };
}

/**
 * Service configuration interface
 */
export interface LocationServiceConfig {
  apis: {
    goong: {
      enabled: boolean;
      apiKey?: string;
      rateLimit: number;
      timeout: number;
    };
    nominatim: {
      enabled: boolean;
      baseUrl: string;
      rateLimit: number;
      timeout: number;
      userAgent: string;
    };
  };
  cache: {
    enabled: boolean;
    defaultTtl: number;
    maxSize: number;
    compressionEnabled: boolean;
  };
  vietnam: {
    priorityBoost: number;
    regionDetectionEnabled: boolean;
    administrativeEnabled: boolean;
  };
  search: {
    defaultLimit: number;
    maxLimit: number;
    minImportance: number;
    enableSuggestions: boolean;
    enableRelatedTerms: boolean;
  };
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  averageResponseTime: number;
  cacheHitRate: number;
  apiUsageStats: Record<
    string,
    {
      calls: number;
      errors: number;
      averageResponseTime: number;
    }
  >;
  vietnamDetectionAccuracy: number;
  topQueries: Array<{ query: string; count: number }>;
  lastUpdated: Date;
}

/**
 * Location enrichment interface
 */
export interface LocationEnrichment {
  timezone?: string;
  weather?: WeatherInfo;
  demographics?: DemographicInfo;
  economics?: EconomicInfo;
  tourism?: TourismInfo;
}

/**
 * Weather information interface
 */
export interface WeatherInfo {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  forecast?: Array<{
    date: string;
    temperature: { min: number; max: number };
    condition: string;
  }>;
}

/**
 * Demographic information interface
 */
export interface DemographicInfo {
  population: number;
  density?: number;
  ageGroups?: Record<string, number>;
  languages?: string[];
}

/**
 * Economic information interface
 */
export interface EconomicInfo {
  currency: string;
  averageIncome?: number;
  costOfLiving?: number;
  majorIndustries?: string[];
}

/**
 * Tourism information interface
 */
export interface TourismInfo {
  popularAttractions?: string[];
  bestTimeToVisit?: string[];
  averageTripDuration?: number;
  budgetRange?: {
    budget: number;
    midRange: number;
    luxury: number;
  };
}

/**
 * Analytics event interface
 */
export interface AnalyticsEvent {
  eventType: 'search' | 'cache_hit' | 'cache_miss' | 'api_call' | 'error';
  query?: string;
  source?: LocationSource;
  resultCount?: number;
  responseTime?: number;
  userCountry?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Export all interfaces for easy importing
 */
export type {
  SmartLocation as Location,
  LocationCoordinates as Coordinates,
  LocationSource as Source,
  VietnameseRegion as VNRegion,
  AdministrativeHierarchy as Administrative,
  LocationMetadata as Metadata,
  BoundingBox as BBox,
  LocationSearchOptions as SearchOptions,
  VietnamDetectionResult as VNDetection,
  SmartLocationSearchResponse as SearchResponse,
  PointOfInterest as POI,
};
