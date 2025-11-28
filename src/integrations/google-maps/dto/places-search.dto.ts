import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class PlacesSearchDto {
  @ApiProperty({
    description: 'Search query text',
    example: 'coffee shop near me',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({
    description: 'Latitude for location biasing',
    example: 37.7749,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(String(value)))
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({
    description: 'Longitude for location biasing',
    example: -122.4194,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(String(value)))
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({
    description: 'Search radius in meters (when lat/lng provided)',
    example: 5000,
    default: 5000,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(String(value), 10))
  @IsNumber()
  radius?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    example: 10,
    default: 10,
    maximum: 20,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(String(value), 10))
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Language code for results (e.g., en, vi)',
    example: 'en',
  })
  @IsString()
  @IsOptional()
  language?: string;
}
