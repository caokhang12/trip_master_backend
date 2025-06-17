import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsNotEmpty,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus, DestinationCoords } from '../../schemas/trip.entity';
import { OptionalDateRangeDto } from '../../shared/dto/date.dto';
import { BaseCoordinateDto } from '../../shared/dto/coordinate.dto';

/**
 * Base trip DTO with core fields
 */
export class TripDto extends OptionalDateRangeDto {
  @ApiPropertyOptional({
    description: 'Total budget for the trip',
    example: 3000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Budget must be a number' })
  @Min(0, { message: 'Budget must be at least 0' })
  budget?: number;

  @ApiPropertyOptional({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';
}

/**
 * Create trip DTO
 */
export class CreateTripDto extends TripDto {
  @ApiProperty({
    description: 'Trip title',
    example: 'Amazing Japan Adventure 2024',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'Trip description',
    example: 'A comprehensive journey through Tokyo and Kyoto',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: 'Destination name',
    example: 'Tokyo, Japan',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  destinationName: string;

  @ApiPropertyOptional({
    description: 'GPS coordinates of the destination',
    type: BaseCoordinateDto,
  })
  @IsOptional()
  @Type(() => BaseCoordinateDto)
  destinationCoords?: DestinationCoords;

  @ApiPropertyOptional({
    description: 'Trip status',
    enum: TripStatus,
    example: TripStatus.PLANNING,
  })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @ApiPropertyOptional({
    description: 'Whether the trip is public',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Destination country code',
    example: 'JP',
  })
  @IsOptional()
  @IsString()
  destinationCountry?: string;

  @ApiPropertyOptional({
    description: 'Destination province/state',
    example: 'Tokyo',
  })
  @IsOptional()
  @IsString()
  destinationProvince?: string;

  @ApiPropertyOptional({
    description: 'Destination city',
    example: 'Tokyo',
  })
  @IsOptional()
  @IsString()
  destinationCity?: string;

  @ApiPropertyOptional({
    description: 'Timezone for the destination',
    example: 'Asia/Tokyo',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Default currency for the destination',
    example: 'JPY',
  })
  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @ApiPropertyOptional({
    description: 'Preferred country for auto-detection',
    example: 'JP',
  })
  @IsOptional()
  @IsString()
  preferredCountry?: string;

  @ApiPropertyOptional({
    description: 'Auto-detect country from coordinates',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  detectCountryFromCoords?: boolean;
}

/**
 * Update trip DTO - all fields optional
 */
export class UpdateTripDto extends TripDto {
  @ApiPropertyOptional({
    description: 'Trip title',
    example: 'Updated Trip Title',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Trip description',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Destination name',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  destinationName?: string;

  @ApiPropertyOptional({
    description: 'GPS coordinates',
    type: BaseCoordinateDto,
  })
  @IsOptional()
  @Type(() => BaseCoordinateDto)
  destinationCoords?: DestinationCoords;

  @ApiPropertyOptional({
    description: 'Trip status',
    enum: TripStatus,
  })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @ApiPropertyOptional({
    description: 'Whether the trip is public',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Destination country code',
  })
  @IsOptional()
  @IsString()
  destinationCountry?: string;

  @ApiPropertyOptional({
    description: 'Destination province/state',
  })
  @IsOptional()
  @IsString()
  destinationProvince?: string;

  @ApiPropertyOptional({
    description: 'Destination city',
  })
  @IsOptional()
  @IsString()
  destinationCity?: string;

  @ApiPropertyOptional({
    description: 'Timezone for the destination',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Default currency for the destination',
  })
  @IsOptional()
  @IsString()
  defaultCurrency?: string;
}
