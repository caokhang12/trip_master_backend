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

// Using shared BaseCoordinateDto instead of local DestinationCoordsDto

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
  currency?: string = 'USD';
}

export class CreateTripDto extends BaseTripDto {
  @ApiProperty({
    description: 'Trip title - should be descriptive and engaging',
    example: 'Amazing Japan Adventure 2024',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description:
      'Detailed description of the trip including highlights and special notes',
    example:
      'A comprehensive 7-day journey through Tokyo and Kyoto, exploring ancient temples, modern technology, and authentic Japanese cuisine. Perfect for first-time visitors to Japan.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Name of the destination city, region, or country',
    example: 'Tokyo, Japan',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
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
  @IsEnum(TripStatus)
  status?: TripStatus;
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
