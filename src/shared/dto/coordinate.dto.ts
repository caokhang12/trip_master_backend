import {
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Base coordinate DTO with latitude and longitude validation
 */
export class BaseCoordinateDto {
  @ApiProperty({
    description: 'Latitude coordinate',
    example: 10.8231,
    minimum: -90,
    maximum: 90,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 106.6297,
    minimum: -180,
    maximum: 180,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

/**
 * Optional coordinate DTO for search requests
 */
export class OptionalCoordinateDto {
  @ApiPropertyOptional({
    description: 'Latitude for nearby search',
    example: 10.8231,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({
    description: 'Longitude for nearby search',
    example: 106.6297,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}

/**
 * Country code validation mixin
 */
export class CountryCodeDto {
  @ApiPropertyOptional({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'VN',
    minLength: 2,
    maxLength: 2,
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;
}

/**
 * Language code validation mixin
 */
export class LanguageCodeDto {
  @ApiPropertyOptional({
    description: 'Language code (ISO 639-1)',
    example: 'vi',
    minLength: 2,
    maxLength: 2,
    default: 'en',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  language?: string = 'en';
}
