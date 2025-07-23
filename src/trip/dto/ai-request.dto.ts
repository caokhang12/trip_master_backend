import {
  IsString,
  IsNumber,
  IsDateString,
  IsArray,
  IsOptional,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserTravelPreferencesDto {
  @ApiProperty({
    description: 'Travel style preference',
    enum: [
      'budget',
      'mid-range',
      'luxury',
      'backpacker',
      'family',
      'romantic',
      'adventure',
      'cultural',
    ],
    example: 'cultural',
  })
  @IsEnum([
    'budget',
    'mid-range',
    'luxury',
    'backpacker',
    'family',
    'romantic',
    'adventure',
    'cultural',
  ])
  travelStyle: string;

  @ApiProperty({
    description: 'List of travel interests',
    type: [String],
    example: ['food', 'history', 'nature', 'photography'],
  })
  @IsArray()
  @IsString({ each: true })
  interests: string[];

  @ApiPropertyOptional({
    description: 'Dietary restrictions',
    type: [String],
    example: ['vegetarian', 'no-seafood'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryRestrictions?: string[];

  @ApiPropertyOptional({
    description: 'Accessibility needs',
    type: [String],
    example: ['wheelchair-accessible', 'no-stairs'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accessibilityNeeds?: string[];

  @ApiPropertyOptional({
    description: 'Preferred transportation method',
    enum: ['walking', 'public-transport', 'motorbike', 'car', 'mixed'],
    example: 'mixed',
  })
  @IsOptional()
  @IsEnum(['walking', 'public-transport', 'motorbike', 'car', 'mixed'])
  transportPreference?: string;

  @ApiPropertyOptional({
    description: 'Activity level preference',
    enum: ['low', 'moderate', 'high'],
    example: 'moderate',
  })
  @IsOptional()
  @IsEnum(['low', 'moderate', 'high'])
  activityLevel?: string;

  @ApiPropertyOptional({
    description: 'Group type',
    enum: ['solo', 'couple', 'family', 'friends', 'business', 'romantic'],
    example: 'couple',
  })
  @IsOptional()
  @IsEnum(['solo', 'couple', 'family', 'friends', 'business', 'romantic'])
  groupType?: string;
}

export class GenerateItineraryDto {
  @ApiProperty({
    description: 'Destination city or area',
    example: 'Ho Chi Minh City',
  })
  @IsString()
  destination: string;

  @ApiProperty({
    description: 'Country code or name',
    example: 'Vietnam',
  })
  @IsString()
  country: string;

  @ApiProperty({
    description: 'Trip start date',
    example: '2024-03-15',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Trip end date',
    example: '2024-03-20',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Total budget for the trip',
    example: 1000000,
  })
  @IsNumber()
  @Min(0)
  budget: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'VND',
  })
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'Number of travelers',
    example: 2,
  })
  @IsNumber()
  @Min(1)
  @Max(20)
  travelers: number;

  @ApiProperty({
    description: 'User travel preferences',
    type: UserTravelPreferencesDto,
  })
  @ValidateNested()
  @Type(() => UserTravelPreferencesDto)
  preferences: UserTravelPreferencesDto;

  @ApiPropertyOptional({
    description: 'Accommodation location if known',
    example: 'District 1, Ho Chi Minh City',
  })
  @IsOptional()
  @IsString()
  accommodationLocation?: string;
}

export class LocationSuggestionsDto {
  @ApiProperty({
    description: 'Location name or coordinates',
    example: 'Ho Chi Minh City',
  })
  @IsString()
  location: string;

  @ApiProperty({
    description: 'Travel style preference',
    enum: [
      'budget',
      'mid-range',
      'luxury',
      'backpacker',
      'family',
      'romantic',
      'adventure',
      'cultural',
    ],
    example: 'cultural',
  })
  @IsEnum([
    'budget',
    'mid-range',
    'luxury',
    'backpacker',
    'family',
    'romantic',
    'adventure',
    'cultural',
  ])
  travelStyle: string;

  @ApiProperty({
    description: 'Budget range for activities',
    example: 500000,
  })
  @IsNumber()
  @Min(0)
  budget: number;

  @ApiPropertyOptional({
    description: 'Specific interests',
    type: [String],
    example: ['food', 'history'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];
}

export class CostEstimationDto {
  @ApiProperty({
    description: 'Destination for cost estimation',
    example: 'Ho Chi Minh City, Vietnam',
  })
  @IsString()
  destination: string;

  @ApiProperty({
    description: 'Type of activity',
    example: 'sightseeing',
  })
  @IsString()
  activityType: string;

  @ApiProperty({
    description: 'Duration in days',
    example: 3,
  })
  @IsNumber()
  @Min(1)
  @Max(30)
  duration: number;

  @ApiPropertyOptional({
    description: 'Number of people',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  travelers?: number;

  @ApiPropertyOptional({
    description: 'Travel style for cost estimation',
    enum: ['budget', 'mid-range', 'luxury'],
    example: 'mid-range',
  })
  @IsOptional()
  @IsEnum(['budget', 'mid-range', 'luxury'])
  travelStyle?: string;
}
