import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Activity } from '../../schemas/itinerary.entity';

/**
 * Activity DTO for itinerary items
 */
export class ActivityDto {
  @ApiProperty({
    description: 'Time of the activity',
    example: '09:00',
  })
  @IsString()
  @IsNotEmpty()
  time: string;

  @ApiProperty({
    description: 'Activity title',
    example: 'Visit Senso-ji Temple',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'Activity description',
    example: "Explore Tokyo's oldest temple",
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Activity location',
    example: 'Asakusa, Tokyo',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({
    description: 'Duration in minutes',
    example: 120,
    minimum: 0,
    maximum: 1440,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1440)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Estimated cost',
    example: 25,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({
    description: 'Activity type',
    example: 'cultural',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;
}

/**
 * Create itinerary DTO
 */
export class CreateItineraryDto {
  @ApiProperty({
    description: 'Day number of the trip',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  dayNumber: number;

  @ApiProperty({
    description: 'Date for this day',
    example: '2024-03-15',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Activities for this day',
    type: [ActivityDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityDto)
  activities: Activity[];
}

/**
 * Update itinerary DTO
 */
export class UpdateItineraryDto {
  @ApiPropertyOptional({
    description: 'Updated date for this day',
    example: '2024-03-15',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({
    description: 'Updated activities for this day',
    type: [ActivityDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityDto)
  activities: Activity[];

  @ApiPropertyOptional({
    description: 'Whether this was user modified',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  userModified?: boolean;
}

/**
 * Generate AI itinerary DTO
 */
export class GenerateItineraryDto {
  @ApiPropertyOptional({
    description: 'Travel style preference',
    example: 'cultural',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  travelStyle?: string;

  @ApiPropertyOptional({
    description: 'Interests and preferences',
    example: ['temples', 'food', 'shopping'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({
    description: 'Include cost estimates',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeCosts?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum activities per day',
    example: 5,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxActivitiesPerDay?: number;
}
