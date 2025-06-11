import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
  Max,
  ValidateNested,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BaseCoordinateDto } from '../../shared/dto/coordinate.dto';
import {
  SearchStrategy,
  LocationType,
  LocationSource,
  VietnamDetectionResult,
  ApiError,
} from '../interfaces/smart-location.interface';

/**
 * Main location search DTO - consolidates all search functionality
 */
export class LocationSearchDto {
  @ApiProperty({
    description: 'Search query (place name, address, or coordinates)',
    example: 'Ho Chi Minh City',
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'User country code for localization',
    example: 'VN',
  })
  @IsOptional()
  @IsString()
  userCountry?: string;

  @ApiPropertyOptional({
    description: 'User location for distance calculations',
    type: BaseCoordinateDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BaseCoordinateDto)
  userLocation?: BaseCoordinateDto;

  @ApiPropertyOptional({
    description: 'Search strategy to use',
    enum: SearchStrategy,
    default: SearchStrategy.AUTO,
  })
  @IsOptional()
  @IsEnum(SearchStrategy, {
    message:
      'Strategy must be one of: auto, vietnam_only, international_only, vietnam_first, international_first',
  })
  strategy?: SearchStrategy;

  @ApiPropertyOptional({
    description: 'Maximum number of results',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a valid number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(50, { message: 'Limit cannot exceed 50' })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Minimum importance score (0-1)',
    example: 0.5,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'MinImportance must be a valid number' })
  @Min(0, { message: 'MinImportance must be at least 0' })
  @Max(1, { message: 'MinImportance cannot exceed 1' })
  minImportance?: number;

  @ApiPropertyOptional({
    description: 'Filter by location type',
    enum: LocationType,
  })
  @IsOptional()
  @IsEnum(LocationType, {
    message:
      'LocationType must be one of: all, cities, provinces, districts, tourist_attractions, airports, landmarks',
  })
  locationType?: LocationType;

  @ApiPropertyOptional({
    description: 'Sources to exclude from search',
    enum: LocationSource,
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }): LocationSource[] => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item: string) => item.trim()) as LocationSource[];
    }
    return Array.isArray(value) ? value : [];
  })
  @IsArray({ message: 'ExcludeSources must be an array' })
  @IsEnum(LocationSource, {
    each: true,
    message:
      'Each exclude source must be one of: database, goong, nominatim, cache, user_input, fallback',
  })
  excludeSources?: LocationSource[];

  @ApiPropertyOptional({
    description: 'Exclude cached results',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean({ message: 'ExcludeCache must be a boolean value' })
  excludeCache?: boolean;

  // Legacy support for backward compatibility
  @ApiPropertyOptional({
    description: 'Legacy latitude parameter',
    example: 10.8231,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Latitude must be a valid number' })
  @IsLatitude({ message: 'Latitude must be between -90 and 90' })
  lat?: number;

  @ApiPropertyOptional({
    description: 'Legacy longitude parameter',
    example: 106.6297,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Longitude must be a valid number' })
  @IsLongitude({ message: 'Longitude must be between -180 and 180' })
  lng?: number;
}

/**
 * Location result DTO - implements SmartLocation interface
 */
export class LocationResultDto {
  @ApiProperty({ description: 'Unique location identifier' })
  id: string;

  @ApiProperty({ description: 'Location name' })
  name: string;

  @ApiProperty({ description: 'Display name with hierarchy' })
  displayName: string;

  @ApiProperty({ description: 'Coordinates', type: BaseCoordinateDto })
  coordinates: BaseCoordinateDto;

  @ApiProperty({ description: 'Country name' })
  country: string;

  @ApiProperty({ description: 'Country code' })
  countryCode: string;

  @ApiPropertyOptional({ description: 'Province/state' })
  province?: string;

  @ApiPropertyOptional({ description: 'District/city' })
  district?: string;

  @ApiPropertyOptional({ description: 'Ward/subdivision' })
  ward?: string;

  @ApiProperty({ description: 'Full address' })
  address: string;

  @ApiProperty({ description: 'Place type/category' })
  placeType: string;

  @ApiProperty({ description: 'Data source', enum: LocationSource })
  source: LocationSource;

  @ApiProperty({ description: 'Importance score (0-1)' })
  importance: number;

  @ApiPropertyOptional({ description: 'Distance from user in km' })
  distanceFromUser?: number;

  @ApiPropertyOptional({ description: 'Vietnam region' })
  vietnamRegion?: string;

  @ApiPropertyOptional({ description: 'Administrative data' })
  administrative?: any;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: any;

  @ApiPropertyOptional({
    description: 'Bounding box [minLat, minLng, maxLat, maxLng]',
    type: [Number],
  })
  boundingBox?: number[];
}

/**
 * Search response metadata DTO - implements interface
 */
export class SearchMetadataDto {
  @ApiProperty({ description: 'Search time in milliseconds' })
  searchTimeMs: number;

  @ApiProperty({ description: 'Strategy used', enum: SearchStrategy })
  strategyUsed: SearchStrategy;

  @ApiProperty({
    description: 'Sources attempted',
    enum: LocationSource,
    isArray: true,
  })
  sourcesAttempted: LocationSource[];

  @ApiProperty({
    description: 'Sources with results',
    enum: LocationSource,
    isArray: true,
  })
  sourcesWithResults: LocationSource[];

  @ApiProperty({ description: 'Cache information' })
  cache: {
    hit: boolean;
    key?: string;
    ttl?: number;
  };

  @ApiProperty({ description: 'Vietnam detection result' })
  vietnamDetection: VietnamDetectionResult;

  @ApiPropertyOptional({ description: 'API usage statistics' })
  apiUsage?: Record<string, any>;

  @ApiPropertyOptional({ description: 'API errors' })
  errors?: ApiError[];
}

/**
 * Location search response DTO
 */
export class LocationSearchResponseDto {
  @ApiProperty({ description: 'Search results', type: [LocationResultDto] })
  results: LocationResultDto[];

  @ApiProperty({ description: 'Search metadata', type: SearchMetadataDto })
  metadata: SearchMetadataDto;

  @ApiProperty({ description: 'Total results found' })
  totalResults: number;

  @ApiProperty({ description: 'Number of results returned' })
  returnedResults: number;

  @ApiProperty({ description: 'Are there more results available' })
  hasMore: boolean;
}

/**
 * Reverse geocoding DTO
 */
export class ReverseGeocodeDto extends BaseCoordinateDto {
  @ApiPropertyOptional({
    description: 'Zoom level for detail',
    example: 18,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  zoom?: number;
}

/**
 * Reverse geocoding metadata DTO
 */
export class ReverseGeocodeMetadataDto {
  @ApiProperty({ description: 'Data source', enum: LocationSource })
  source: LocationSource;

  @ApiProperty({ description: 'Confidence score (0-1)' })
  confidence: number;

  @ApiProperty({ description: 'Zoom level used' })
  zoom: number;

  @ApiProperty({ description: 'Search time in milliseconds' })
  searchTimeMs: number;
}

/**
 * Reverse geocoding response DTO
 */
export class ReverseGeocodeResponseDto {
  @ApiProperty({ description: 'Location result', type: LocationResultDto })
  location: LocationResultDto;

  @ApiProperty({
    description: 'Reverse geocoding metadata',
    type: ReverseGeocodeMetadataDto,
  })
  metadata: ReverseGeocodeMetadataDto;
}

/**
 * Bulk location search DTO
 */
export class BulkLocationSearchDto {
  @ApiProperty({
    description: 'List of search queries',
    example: ['Ho Chi Minh City', 'Hanoi', 'Da Nang'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  queries: string[];

  @ApiPropertyOptional({
    description: 'User country code',
    example: 'VN',
  })
  @IsOptional()
  @IsString()
  userCountry?: string;

  @ApiPropertyOptional({
    description: 'Search strategy',
    enum: SearchStrategy,
    default: SearchStrategy.AUTO,
  })
  @IsOptional()
  @IsEnum(SearchStrategy)
  strategy?: SearchStrategy;

  @ApiPropertyOptional({
    description: 'Maximum results per query',
    example: 5,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limitPerQuery?: number;
}

/**
 * Bulk search metadata DTO
 */
export class BulkSearchMetadataDto {
  @ApiProperty({ description: 'Total queries processed' })
  totalQueries: number;

  @ApiProperty({ description: 'Successful queries' })
  successfulQueries: number;

  @ApiProperty({ description: 'Failed queries' })
  failedQueries: number;

  @ApiProperty({ description: 'Total search time in milliseconds' })
  totalSearchTimeMs: number;

  @ApiProperty({ description: 'Strategy used', enum: SearchStrategy })
  strategyUsed: SearchStrategy;
}

/**
 * Bulk location search response DTO
 */
export class BulkLocationSearchResponseDto {
  @ApiProperty({
    description: 'Results per query',
    additionalProperties: {
      type: 'array',
      items: { $ref: '#/components/schemas/LocationResultDto' },
    },
  })
  results: Record<string, LocationResultDto[]>;

  @ApiProperty({
    description: 'Bulk search metadata',
    type: BulkSearchMetadataDto,
  })
  metadata: BulkSearchMetadataDto;
}

/**
 * POI search DTO
 */
export class POISearchDto extends BaseCoordinateDto {
  @ApiPropertyOptional({
    description: 'Search radius in kilometers',
    example: 5,
    minimum: 0.1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radius?: number;

  @ApiPropertyOptional({
    description: 'POI category filter',
    example: 'restaurant',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results',
    example: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

/**
 * Weather request DTO
 */
export class WeatherDto extends BaseCoordinateDto {
  @ApiPropertyOptional({
    description: 'Temperature units',
    example: 'metric',
    enum: ['metric', 'imperial'],
  })
  @IsOptional()
  @IsString()
  units?: 'metric' | 'imperial';
}
