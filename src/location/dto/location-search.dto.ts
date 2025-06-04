import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for location search requests
 */
export class LocationSearchDto {
  @ApiProperty({
    description: 'Search query for location',
    example: 'Hồ Chí Minh',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({
    description: 'User country code for optimization',
    example: 'VN',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiProperty({
    description: 'Limit number of results',
    example: 10,
    required: false,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiProperty({
    description: 'Latitude for nearby search',
    example: 10.8231,
    required: false,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiProperty({
    description: 'Longitude for nearby search',
    example: 106.6297,
    required: false,
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
