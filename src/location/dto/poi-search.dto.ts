import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BaseCoordinateDto } from '../../shared/dto/coordinate.dto';

/**
 * Enum for POI categories
 */
export enum POICategory {
  ATTRACTIONS = 'attractions',
  RESTAURANTS = 'restaurants',
  HOTELS = 'hotels',
  SHOPPING = 'shopping',
  ENTERTAINMENT = 'entertainment',
  TRANSPORTATION = 'transportation',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  BANKS = 'banks',
  ALL = 'all',
}

/**
 * DTO for POI (Points of Interest) search requests
 */
export class POISearchDto extends BaseCoordinateDto {
  @ApiProperty({
    description: 'Category of places to search for',
    enum: POICategory,
    example: POICategory.ATTRACTIONS,
    required: false,
  })
  @IsOptional()
  @IsEnum(POICategory)
  category?: POICategory = POICategory.ALL;

  @ApiProperty({
    description: 'Search radius in meters',
    example: 5000,
    required: false,
    minimum: 100,
    maximum: 50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(50000)
  radius?: number = 5000;

  @ApiProperty({
    description: 'Limit number of results',
    example: 20,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Specific search query within category',
    example: 'coffee shop',
    required: false,
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({
    description: 'Language for results (ISO 639-1)',
    example: 'vi',
    required: false,
    minLength: 2,
    maxLength: 2,
    default: 'en',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  language?: string = 'en';
}
