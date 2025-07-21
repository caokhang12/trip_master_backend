import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsNotEmpty,
  MaxLength,
  MinLength,
  Min,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus, DestinationCoords } from '../../schemas/trip.entity';
import { OptionalDateRangeDto } from '../../shared/dto/date.dto';
import { BaseCoordinateDto } from '../../shared/dto/coordinate.dto';

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
    description: 'Trip tags for categorization',
    example: ['budget', 'backpacking', 'solo-travel'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

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
    maxLength: 2,
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Country code must be exactly 2 characters' })
  @MaxLength(2, { message: 'Country code must be exactly 2 characters' })
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
}

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
}
