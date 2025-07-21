import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsIn,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus } from '../../schemas/trip.entity';
import {
  ExtendedPaginationDto,
  PaginationDto,
} from '../../shared/dto/pagination.dto';

// Valid region values
const VALID_REGIONS = [
  'southeast-asia',
  'east-asia',
  'south-asia',
  'central-asia',
  'western-asia',
  'europe',
  'north-america',
  'south-america',
  'africa',
  'oceania',
] as const;

/**
 * Trip query DTO for filtering and pagination
 */
export class TripQueryDto extends ExtendedPaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by trip status',
    enum: TripStatus,
    example: TripStatus.PLANNING,
  })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @ApiPropertyOptional({
    description: 'Filter by geographical region',
    enum: VALID_REGIONS,
    example: 'southeast-asia',
  })
  @IsOptional()
  @IsString()
  @IsIn(VALID_REGIONS, {
    message: 'Region must be a valid geographical region',
  })
  region?: string;

  @ApiPropertyOptional({
    description: 'User latitude for distance calculation',
    example: 10.8231,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Latitude must be a number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  userLat?: number;

  @ApiPropertyOptional({
    description: 'User longitude for distance calculation',
    example: 106.6297,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Longitude must be a number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  userLng?: number;

  @ApiPropertyOptional({
    description: 'Filter by destination country',
    example: 'JP',
  })
  @IsOptional()
  @IsString()
  destinationCountry?: string;

  @ApiPropertyOptional({
    description: 'Filter by destination city',
    example: 'Tokyo',
  })
  @IsOptional()
  @IsString()
  destinationCity?: string;

  @ApiPropertyOptional({
    description: 'Filter by timezone',
    example: 'Asia/Tokyo',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}

/**
 * Trip search DTO
 */
export class TripSearchDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search query string',
    example: 'Tokyo adventure',
  })
  @IsOptional()
  @IsString()
  query?: string;
}

/**
 * Share trip DTO
 */
export class ShareTripDto {
  @ApiPropertyOptional({
    description: 'Expiration date for the share link',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
