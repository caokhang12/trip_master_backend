import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsObject,
  ValidateNested,
  IsNotEmpty,
  MaxLength,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  IsISO8601,
  Length,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus, DestinationCoords } from '../../schemas/trip.entity';
import { Activity } from '../../schemas/itinerary.entity';
import {
  ExtendedPaginationDto,
  PaginationDto,
} from '../../shared/dto/pagination.dto';
import { OptionalDateRangeDto } from '../../shared/dto/date.dto';
import { BaseCoordinateDto } from '../../shared/dto/coordinate.dto';
import {
  IsValidCountryCurrency,
  IsValidCountryTimezone,
} from './validators/country-validation.decorator';

/**
 * Base trip DTO that combines date and budget validation
 */
export class BaseTripDto extends OptionalDateRangeDto {
  @ApiPropertyOptional({
    description: 'Total budget for the trip in the specified currency',
    example: 3000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Budget must be a number' })
  @Min(0, { message: 'Budget must be at least 0' })
  budget?: number;

  @ApiPropertyOptional({
    description: 'Currency code for the budget (ISO 4217)',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsValidCountryCurrency({
    message:
      'Invalid currency code. Please use a valid ISO 4217 currency code.',
  })
  currency?: string = 'USD';
}

export class CreateTripDto extends BaseTripDto {
  @ApiProperty({
    description: 'Trip title - should be descriptive and engaging',
    example: 'Amazing Japan Adventure 2024',
    maxLength: 255,
  })
  @IsString({ message: 'Trip title must be a string' })
  @IsNotEmpty({ message: 'Trip title is required' })
  @MaxLength(255, { message: 'Trip title must not exceed 255 characters' })
  title: string;

  @ApiPropertyOptional({
    description:
      'Detailed description of the trip including highlights and special notes',
    example:
      'A comprehensive 7-day journey through Tokyo and Kyoto, exploring ancient temples, modern technology, and authentic Japanese cuisine. Perfect for first-time visitors to Japan.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(2000, { message: 'Description must not exceed 2000 characters' })
  description?: string;

  @ApiProperty({
    description: 'Name of the destination city, region, or country',
    example: 'Tokyo, Japan',
    maxLength: 255,
  })
  @IsString({ message: 'Destination name must be a string' })
  @IsNotEmpty({ message: 'Destination name is required' })
  @MaxLength(255, {
    message: 'Destination name must not exceed 255 characters',
  })
  destinationName: string;

  @ApiPropertyOptional({
    description: 'GPS coordinates of the destination for map integration',
    type: BaseCoordinateDto,
    example: {
      lat: 35.6762,
      lng: 139.6503,
    },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BaseCoordinateDto)
  destinationCoords?: DestinationCoords;

  @ApiPropertyOptional({
    description:
      'User-preferred destination country code (ISO 3166-1 alpha-2) for country-aware features',
    example: 'JP',
    minLength: 2,
    maxLength: 2,
  })
  @IsOptional()
  @IsString({ message: 'Preferred country must be a string' })
  @Length(2, 2, {
    message:
      'Preferred country must be exactly 2 characters (ISO 3166-1 alpha-2)',
  })
  preferredCountry?: string;

  @ApiPropertyOptional({
    description:
      'Automatically detect country from GPS coordinates if provided',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Detect country from coordinates must be a boolean' })
  detectCountryFromCoords?: boolean = true;

  @ApiPropertyOptional({
    description:
      'Destination country code (ISO 3166-1 alpha-2) - auto-populated if not provided',
    example: 'JP',
    minLength: 2,
    maxLength: 2,
  })
  @IsOptional()
  @IsString({ message: 'Destination country must be a string' })
  @Length(2, 2, {
    message:
      'Destination country must be exactly 2 characters (ISO 3166-1 alpha-2)',
  })
  destinationCountry?: string;

  @ApiPropertyOptional({
    description: 'Destination province or state',
    example: 'Tokyo',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  destinationProvince?: string;

  @ApiPropertyOptional({
    description: 'Destination city',
    example: 'Tokyo',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  destinationCity?: string;

  @ApiPropertyOptional({
    description: 'Timezone of the destination (IANA timezone identifier)',
    example: 'Asia/Tokyo',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @IsValidCountryTimezone({
    message: 'Invalid timezone. Please use a valid IANA timezone identifier.',
  })
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Default currency for the destination (ISO 4217)',
    example: 'JPY',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @IsValidCountryCurrency({
    message:
      'Invalid currency code. Please use a valid ISO 4217 currency code.',
  })
  defaultCurrency?: string;

  @ApiPropertyOptional({
    description: 'Current status of the trip',
    enum: TripStatus,
    example: TripStatus.PLANNING,
    default: TripStatus.PLANNING,
  })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @ApiPropertyOptional({
    description: 'Whether the trip can be viewed publicly via sharing',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateTripDto extends BaseTripDto {
  @ApiPropertyOptional({
    description: 'Updated trip title',
    example: 'Amazing Japan Adventure 2024 - Extended',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated detailed description of the trip',
    example:
      'Extended 10-day journey through Tokyo, Kyoto, and Osaka with additional cultural experiences.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated destination name',
    example: 'Tokyo & Kyoto, Japan',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  destinationName?: string;

  @ApiPropertyOptional({
    description: 'Updated GPS coordinates of the destination',
    type: BaseCoordinateDto,
    example: {
      lat: 35.0116,
      lng: 135.7681,
    },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BaseCoordinateDto)
  destinationCoords?: DestinationCoords;

  @ApiPropertyOptional({
    description:
      'Updated destination country code (ISO 3166-1 alpha-2) - will trigger cascading updates',
    example: 'JP',
    minLength: 2,
    maxLength: 2,
  })
  @IsOptional()
  @IsString({ message: 'Destination country must be a string' })
  @Length(2, 2, {
    message:
      'Destination country must be exactly 2 characters (ISO 3166-1 alpha-2)',
  })
  destinationCountry?: string;

  @ApiPropertyOptional({
    description:
      'Re-detect country from coordinates if GPS coordinates are updated',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean({
    message: 'Re-detect country from coordinates must be a boolean',
  })
  reDetectCountryFromCoords?: boolean;

  @ApiPropertyOptional({
    description: 'Auto-update currency when destination country changes',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Auto-update currency must be a boolean' })
  autoUpdateCurrency?: boolean = true;

  @ApiPropertyOptional({
    description: 'Updated destination province or state',
    example: 'Kyoto',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  destinationProvince?: string;

  @ApiPropertyOptional({
    description: 'Updated destination city',
    example: 'Kyoto',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  destinationCity?: string;

  @ApiPropertyOptional({
    description:
      'Updated timezone of the destination (IANA timezone identifier)',
    example: 'Asia/Tokyo',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @IsValidCountryTimezone({
    message: 'Invalid timezone. Please use a valid IANA timezone identifier.',
  })
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Updated default currency for the destination (ISO 4217)',
    example: 'JPY',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @IsValidCountryCurrency({
    message:
      'Invalid currency code. Please use a valid ISO 4217 currency code.',
  })
  defaultCurrency?: string;

  @ApiPropertyOptional({
    description: 'Updated trip status',
    enum: TripStatus,
    example: TripStatus.BOOKED,
  })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @ApiPropertyOptional({
    description: 'Updated public visibility setting',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class TripQueryDto extends ExtendedPaginationDto {
  @ApiPropertyOptional({
    description: 'Filter trips by status',
    enum: TripStatus,
    example: TripStatus.PLANNING,
  })
  @IsOptional()
  @IsEnum(TripStatus, {
    message: 'Status must be a valid TripStatus enum value',
  })
  status?: TripStatus;

  @ApiPropertyOptional({
    description:
      'Filter trips by destination country code (ISO 3166-1 alpha-2)',
    example: 'VN',
    minLength: 2,
    maxLength: 2,
  })
  @IsOptional()
  @IsString({ message: 'Country filter must be a string' })
  @Length(2, 2, {
    message: 'Country code must be exactly 2 characters (ISO 3166-1 alpha-2)',
  })
  country?: string;

  @ApiPropertyOptional({
    description: 'Filter trips by geographical region',
    example: 'southeast-asia',
    enum: [
      'southeast-asia',
      'east-asia',
      'south-asia',
      'europe',
      'north-america',
      'south-america',
      'africa',
      'oceania',
      'middle-east',
    ],
  })
  @IsOptional()
  @IsString({ message: 'Region filter must be a string' })
  @IsEnum(
    [
      'southeast-asia',
      'east-asia',
      'south-asia',
      'europe',
      'north-america',
      'south-america',
      'africa',
      'oceania',
      'middle-east',
    ],
    {
      message: 'Region must be a valid geographical region',
    },
  )
  region?: string;

  @ApiPropertyOptional({
    description:
      'Filter trips by destination country code (deprecated - use "country" instead)',
    example: 'JP',
    minLength: 2,
    maxLength: 2,
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  destinationCountry?: string;

  @ApiPropertyOptional({
    description: 'Filter trips by destination city',
    example: 'Ho Chi Minh City',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'City filter must be a string' })
  @MaxLength(255, { message: 'City name must not exceed 255 characters' })
  destinationCity?: string;

  @ApiPropertyOptional({
    description: 'Filter trips by timezone',
    example: 'Asia/Ho_Chi_Minh',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Timezone filter must be a string' })
  @MaxLength(50, { message: 'Timezone must not exceed 50 characters' })
  @IsValidCountryTimezone({
    message: 'Invalid timezone. Please use a valid IANA timezone identifier.',
  })
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Filter trips by default currency (ISO 4217)',
    example: 'VND',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString({ message: 'Currency filter must be a string' })
  @Length(3, 3, {
    message: 'Currency code must be exactly 3 characters (ISO 4217)',
  })
  @IsValidCountryCurrency({
    message:
      'Invalid currency code. Please use a valid ISO 4217 currency code.',
  })
  defaultCurrency?: string;

  @ApiPropertyOptional({
    description:
      'Sort trips by proximity to user location (requires userLat and userLng)',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Sort by proximity must be a boolean' })
  sortByProximity?: boolean;

  @ApiPropertyOptional({
    description: 'User latitude for proximity sorting',
    example: 10.8231,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'User latitude must be a number' })
  @Min(-90, { message: 'User latitude must be at least -90' })
  @Max(90, { message: 'User latitude must be at most 90' })
  userLat?: number;

  @ApiPropertyOptional({
    description: 'User longitude for proximity sorting',
    example: 106.6297,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'User longitude must be a number' })
  @Min(-180, { message: 'User longitude must be at least -180' })
  @Max(180, { message: 'User longitude must be at most 180' })
  userLng?: number;
}

export class ActivityDto {
  @ApiProperty({
    description: 'Time of the activity (24-hour format)',
    example: '09:00',
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @IsNotEmpty()
  time: string;

  @ApiProperty({
    description: 'Title/name of the activity',
    example: 'Visit Senso-ji Temple',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the activity',
    example:
      "Explore Tokyo's oldest temple, founded in 645 AD. Experience traditional Japanese architecture and participate in incense ritual.",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Location/address of the activity',
    example: '2-3-1 Asakusa, Taito City, Tokyo 111-0032, Japan',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Duration of the activity in minutes',
    example: 120,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Duration must be a number' })
  @Min(0, { message: 'Duration must be at least 0' })
  duration?: number;

  @ApiPropertyOptional({
    description: 'Estimated cost of the activity',
    example: 25.5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Cost must be a number' })
  @Min(0, { message: 'Cost must be at least 0' })
  cost?: number;

  @ApiPropertyOptional({
    description: 'Type/category of the activity',
    example: 'cultural',
    enum: [
      'cultural',
      'entertainment',
      'dining',
      'shopping',
      'outdoor',
      'transport',
      'accommodation',
      'other',
    ],
  })
  @IsOptional()
  @IsString()
  type?: string;
}

export class CreateItineraryDto {
  @ApiProperty({
    description: 'Day number of the itinerary (starts from 1)',
    example: 1,
    minimum: 1,
  })
  @IsNumber({}, { message: 'Day number must be a number' })
  @Min(1, { message: 'Day number must be at least 1' })
  dayNumber: number;

  @ApiPropertyOptional({
    description:
      'Specific date for this day of the itinerary (ISO 8601 format)',
    example: '2024-03-15',
    format: 'date',
  })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiProperty({
    description: 'List of activities for this day',
    type: [ActivityDto],
    example: [
      {
        time: '09:00',
        title: 'Visit Senso-ji Temple',
        description: "Explore Tokyo's oldest temple",
        location: 'Asakusa, Tokyo',
        duration: 120,
        cost: 0,
        type: 'cultural',
      },
      {
        time: '14:00',
        title: 'Lunch at Tsukiji Market',
        description: 'Fresh sushi and seafood experience',
        location: 'Tsukiji, Tokyo',
        duration: 90,
        cost: 45,
        type: 'dining',
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ActivityDto)
  activities: Activity[];
}

export class UpdateItineraryDto {
  @ApiPropertyOptional({
    description: 'Updated specific date for this day of the itinerary',
    example: '2024-03-16',
    format: 'date',
  })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiProperty({
    description: 'Updated list of activities for this day',
    type: [ActivityDto],
    example: [
      {
        time: '10:00',
        title: 'Tokyo National Museum',
        description: 'Discover Japanese art and cultural artifacts',
        location: 'Ueno, Tokyo',
        duration: 180,
        cost: 20,
        type: 'cultural',
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ActivityDto)
  activities: Activity[];

  @ApiPropertyOptional({
    description:
      'Flag indicating if the itinerary was manually modified by the user',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  userModified?: boolean;
}

export class GenerateItineraryDto {
  @ApiPropertyOptional({
    description: 'User preferences for AI itinerary generation',
    example:
      'I prefer cultural activities and local food experiences. I want to avoid crowded tourist spots and prefer authentic experiences.',
  })
  @IsOptional()
  @IsString()
  preferences?: string;

  @ApiPropertyOptional({
    description: 'List of user interests for personalized recommendations',
    example: ['culture', 'food', 'history', 'temples', 'gardens'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({
    description: 'Budget preference level for activity recommendations',
    example: 'moderate',
    enum: ['budget', 'moderate', 'luxury'],
  })
  @IsOptional()
  @IsString()
  budgetPreference?: string;
}

export class ShareTripDto {
  @ApiPropertyOptional({
    description: 'Expiration date for the trip share link (ISO 8601 format)',
    example: '2024-12-31T23:59:59.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class TripSearchDto extends PaginationDto {
  @ApiProperty({
    description:
      'Search query for finding trips by title, destination, or description',
    example: 'Japan temple culture',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({
    description: 'Maximum number of search results per page',
    example: 10,
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(50, { message: 'Limit must be at most 50' })
  limit?: number = 10;
}

/**
 * Comprehensive trip response DTO with country-specific information
 */
export class TripResponseDto {
  @ApiProperty({
    description: 'Unique trip identifier',
    example: 'uuid-123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Trip title',
    example: 'Amazing Japan Adventure 2024',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Trip description',
    example: 'A comprehensive 7-day journey through Tokyo and Kyoto',
  })
  description?: string;

  @ApiProperty({
    description: 'Destination name',
    example: 'Tokyo, Japan',
  })
  destinationName: string;

  @ApiPropertyOptional({
    description: 'Formatted location string (City, Province, Country)',
    example: 'Tokyo, Tokyo Metropolis, Japan',
  })
  formattedLocation?: string;

  @ApiPropertyOptional({
    description: 'GPS coordinates of the destination',
    type: BaseCoordinateDto,
    example: { lat: 35.6762, lng: 139.6503 },
  })
  destinationCoords?: DestinationCoords;

  @ApiPropertyOptional({
    description: 'Destination country code (ISO 3166-1 alpha-2)',
    example: 'JP',
  })
  destinationCountry?: string;

  @ApiPropertyOptional({
    description: 'Destination country name',
    example: 'Japan',
  })
  destinationCountryName?: string;

  @ApiPropertyOptional({
    description: 'Destination province or state',
    example: 'Tokyo Metropolis',
  })
  destinationProvince?: string;

  @ApiPropertyOptional({
    description: 'Destination city',
    example: 'Tokyo',
  })
  destinationCity?: string;

  @ApiProperty({
    description: 'Trip start date',
    example: '2024-03-15',
    format: 'date',
  })
  startDate: string;

  @ApiProperty({
    description: 'Trip end date',
    example: '2024-03-22',
    format: 'date',
  })
  endDate: string;

  @ApiProperty({
    description: 'Duration of the trip in days',
    example: 7,
  })
  durationDays: number;

  @ApiPropertyOptional({
    description: 'Total budget for the trip',
    example: 3000,
  })
  budget?: number;

  @ApiPropertyOptional({
    description: 'Budget currency code',
    example: 'USD',
  })
  currency?: string;

  @ApiPropertyOptional({
    description: 'Default currency for the destination',
    example: 'JPY',
  })
  defaultCurrency?: string;

  @ApiPropertyOptional({
    description: 'Timezone of the destination',
    example: 'Asia/Tokyo',
  })
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Current local time at destination',
    example: '2024-06-05T14:30:00+09:00',
  })
  currentLocalTime?: string;

  @ApiProperty({
    description: 'Current status of the trip',
    enum: TripStatus,
    example: TripStatus.PLANNING,
  })
  status: TripStatus;

  @ApiProperty({
    description: 'Whether the trip is publicly visible',
    example: false,
  })
  isPublic: boolean;

  @ApiProperty({
    description: 'Trip creation date',
    example: '2024-06-01T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Trip last update date',
    example: '2024-06-05T15:30:00.000Z',
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description: 'Weather recommendations based on travel dates and location',
    example: {
      season: 'spring',
      averageTemp: { min: 10, max: 20, unit: 'celsius' },
      weatherDescription: 'Mild spring weather with cherry blossoms',
      packingRecommendations: [
        'Light jacket for cool evenings',
        'Comfortable walking shoes',
        'Umbrella for spring showers',
        'Layers for temperature changes',
      ],
      bestTimeToVisit: 'Late March to early May for cherry blossom season',
      climateWarnings: [
        'Spring rain showers are common',
        'Temperature can vary significantly between day and night',
      ],
    },
  })
  weatherRecommendations?: {
    season: string;
    averageTemp: {
      min: number;
      max: number;
      unit: 'celsius' | 'fahrenheit';
    };
    weatherDescription: string;
    packingRecommendations: string[];
    bestTimeToVisit: string;
    climateWarnings: string[];
  };

  @ApiPropertyOptional({
    description: 'Country-specific travel information',
    example: {
      languageCode: 'ja',
      languageName: 'Japanese',
      currencySymbol: '¥',
      emergencyNumber: '110',
      timeFormat: '24-hour',
      weekStartsOn: 'monday',
      plugType: ['A', 'B'],
      voltage: '100V',
      drivingSide: 'left',
      tippingCustom: 'Tipping is not customary in Japan',
    },
  })
  countryInfo?: {
    languageCode: string;
    languageName: string;
    currencySymbol: string;
    emergencyNumber: string;
    timeFormat: '12-hour' | '24-hour';
    weekStartsOn: 'sunday' | 'monday';
    plugType: string[];
    voltage: string;
    drivingSide: 'left' | 'right';
    tippingCustom: string;
  };

  @ApiPropertyOptional({
    description: 'Number of days in the itinerary',
    example: 5,
  })
  itineraryDaysCount?: number;

  @ApiPropertyOptional({
    description: 'Trip sharing information if shared',
    example: {
      shareToken: 'abc123def456',
      isShared: true,
      sharedAt: '2024-06-05T10:00:00.000Z',
      expiresAt: '2024-12-31T23:59:59.000Z',
    },
  })
  shareInfo?: {
    shareToken: string;
    isShared: boolean;
    sharedAt: string;
    expiresAt?: string;
  };
}

/**
 * Extended trip response DTO with enhanced country-aware metadata
 */
export class CountryAwareTripResponseDto extends TripResponseDto {
  @ApiPropertyOptional({
    description:
      'Auto-detected destination country from GPS coordinates or location name',
    example: 'VN',
  })
  detectedCountry?: string;

  @ApiPropertyOptional({
    description: 'System-suggested currency based on destination country',
    example: 'VND',
  })
  suggestedCurrency?: string;

  @ApiPropertyOptional({
    description: 'Enhanced formatted location string with complete hierarchy',
    example: 'Ho Chi Minh City, Ho Chi Minh, Vietnam',
  })
  enhancedFormattedLocation?: string;

  @ApiPropertyOptional({
    description: 'Detailed geographical region information',
    example: {
      region: 'southeast-asia',
      subRegion: 'mainland-southeast-asia',
      continent: 'asia',
      borders: ['KH', 'LA', 'CN'],
      isIsland: false,
      isLandlocked: false,
    },
  })
  geographicalInfo?: {
    region: string;
    subRegion: string;
    continent: string;
    borders: string[];
    isIsland: boolean;
    isLandlocked: boolean;
  };

  @ApiPropertyOptional({
    description: 'Enhanced weather recommendations with seasonal insights',
    example: {
      currentSeason: 'dry-season',
      seasonalPattern: 'tropical-monsoon',
      monthlyTemperatures: [
        { month: 'march', avgMin: 24, avgMax: 32, rainfall: 15 },
        { month: 'april', avgMin: 26, avgMax: 35, rainfall: 45 },
      ],
      bestMonthsToVisit: ['december', 'january', 'february'],
      avoidMonths: ['may', 'june', 'july', 'august', 'september'],
      packingByMonth: {
        march: ['light-clothing', 'sun-protection', 'rain-jacket'],
        april: [
          'lightweight-breathable-fabrics',
          'umbrella',
          'mosquito-repellent',
        ],
      },
      healthConsiderations: [
        'stay-hydrated',
        'sun-protection',
        'insect-protection',
      ],
    },
  })
  enhancedWeatherRecommendations?: {
    currentSeason: string;
    seasonalPattern: string;
    monthlyTemperatures: Array<{
      month: string;
      avgMin: number;
      avgMax: number;
      rainfall: number;
    }>;
    bestMonthsToVisit: string[];
    avoidMonths: string[];
    packingByMonth: Record<string, string[]>;
    healthConsiderations: string[];
  };

  @ApiPropertyOptional({
    description:
      'Enhanced country-specific travel information with cultural insights',
    example: {
      culturalInsights: {
        greetingCustoms: 'Slight bow or handshake',
        dressCode: 'Modest clothing for temples and religious sites',
        businessEtiquette: 'Business cards with both hands',
        socialCustoms: ['remove-shoes-indoors', 'respect-for-elders'],
      },
      practicalInfo: {
        visaRequirements: {
          exemptCountries: ['TH', 'SG', 'MY', 'ID', 'PH'],
          visaOnArrival: ['US', 'CA', 'AU', 'UK', 'DE'],
          eVisaAvailable: true,
          maxStayWithoutVisa: 15,
        },
        transportation: {
          primaryModes: ['motorbike', 'taxi', 'bus'],
          publicTransport: ['bus', 'motorbike-taxi'],
          ridesharing: ['grab', 'be', 'gojek'],
          averageTaxiFare: {
            currency: 'VND',
            shortRide: 50000,
            longRide: 150000,
          },
        },
        connectivity: {
          internetAvailability: 'excellent',
          wifiCoverage: 'widespread',
          mobileNetworks: ['3G', '4G', '5G'],
          simCardAvailability: 'easy-to-purchase',
        },
      },
    },
  })
  enhancedCountryInfo?: {
    culturalInsights: {
      greetingCustoms: string;
      dressCode: string;
      businessEtiquette: string;
      socialCustoms: string[];
    };
    practicalInfo: {
      visaRequirements: {
        exemptCountries: string[];
        visaOnArrival: string[];
        eVisaAvailable: boolean;
        maxStayWithoutVisa: number;
      };
      transportation: {
        primaryModes: string[];
        publicTransport: string[];
        ridesharing: string[];
        averageTaxiFare: {
          currency: string;
          shortRide: number;
          longRide: number;
        };
      };
      connectivity: {
        internetAvailability: string;
        wifiCoverage: string;
        mobileNetworks: string[];
        simCardAvailability: string;
      };
    };
  };

  @ApiPropertyOptional({
    description: 'Distance from user current location in kilometers',
    example: 1250.5,
  })
  distanceFromUser?: number;

  @ApiPropertyOptional({
    description: 'Estimated travel time from user location',
    example: {
      byAir: {
        duration: '2h 30m',
        estimatedCost: { min: 150, max: 400, currency: 'USD' },
      },
      byLand: {
        duration: '18h',
        estimatedCost: { min: 25, max: 80, currency: 'USD' },
      },
      bySea: {
        duration: '36h',
        estimatedCost: { min: 45, max: 120, currency: 'USD' },
      },
    },
  })
  travelTimeFromUser?: {
    byAir?: {
      duration: string;
      estimatedCost: { min: number; max: number; currency: string };
    };
    byLand?: {
      duration: string;
      estimatedCost: { min: number; max: number; currency: string };
    };
    bySea?: {
      duration: string;
      estimatedCost: { min: number; max: number; currency: string };
    };
  };

  @ApiPropertyOptional({
    description: 'Cost of living comparison with user home country',
    example: {
      comparison: 'much-lower',
      percentageDifference: -65,
      categories: {
        accommodation: {
          difference: -70,
          note: 'Hotels and hostels significantly cheaper',
        },
        food: { difference: -80, note: 'Local food extremely affordable' },
        transport: {
          difference: -85,
          note: 'Very cheap public transport and taxis',
        },
        activities: {
          difference: -60,
          note: 'Tours and attractions reasonably priced',
        },
      },
    },
  })
  costOfLivingComparison?: {
    comparison: 'much-lower' | 'lower' | 'similar' | 'higher' | 'much-higher';
    percentageDifference: number;
    categories: {
      accommodation: { difference: number; note: string };
      food: { difference: number; note: string };
      transport: { difference: number; note: string };
      activities: { difference: number; note: string };
    };
  };
}
