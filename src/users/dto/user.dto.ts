import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  ValidateNested,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TravelStyle } from '../../shared/types/base-response.types';

/**
 * DTO for budget range
 */
export class BudgetRangeDto {
  @ApiProperty({
    description: 'Minimum budget amount',
    example: 500,
    minimum: 0,
  })
  @IsNumber({}, { message: 'Minimum budget must be a number' })
  @Min(0, { message: 'Minimum budget must be greater than or equal to 0' })
  min: number;

  @ApiProperty({
    description: 'Maximum budget amount',
    example: 2000,
    minimum: 0,
  })
  @IsNumber({}, { message: 'Maximum budget must be a number' })
  @Min(0, { message: 'Maximum budget must be greater than or equal to 0' })
  max: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
    maxLength: 3,
  })
  @IsString({ message: 'Currency must be a string' })
  @MaxLength(3, { message: 'Currency code must not exceed 3 characters' })
  currency: string;
}

/**
 * DTO for updating user profile
 */
export class UpdateProfileDto {
  @ApiProperty({
    description: 'User first name',
    example: 'John',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName?: string;

  @ApiProperty({
    description: 'User avatar image URL',
    example: 'https://example.com/avatars/john-doe.jpg',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Avatar URL must be a string' })
  @IsUrl({}, { message: 'Avatar URL must be a valid URL' })
  avatarUrl?: string;
}

/**
 * DTO for updating user preferences
 */
export class UpdatePreferencesDto {
  @ApiProperty({
    description: 'Preferred travel styles',
    enum: TravelStyle,
    isArray: true,
    required: false,
    example: [TravelStyle.ADVENTURE, TravelStyle.CULTURAL],
  })
  @IsOptional()
  @IsArray({ message: 'Travel style must be an array' })
  @IsEnum(TravelStyle, {
    each: true,
    message: 'Each travel style must be a valid option',
  })
  travelStyle?: TravelStyle[];

  @ApiProperty({
    description: 'Budget range for trips',
    type: BudgetRangeDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BudgetRangeDto)
  budgetRange?: BudgetRangeDto;

  @ApiProperty({
    description: 'User interests and hobbies',
    type: [String],
    required: false,
    example: ['photography', 'hiking', 'museums', 'local cuisine'],
  })
  @IsOptional()
  @IsArray({ message: 'Interests must be an array' })
  @IsString({ each: true, message: 'Each interest must be a string' })
  interests?: string[];

  @ApiProperty({
    description: 'Dietary restrictions and preferences',
    type: [String],
    required: false,
    example: ['vegetarian', 'gluten-free', 'halal'],
  })
  @IsOptional()
  @IsArray({ message: 'Dietary restrictions must be an array' })
  @IsString({
    each: true,
    message: 'Each dietary restriction must be a string',
  })
  dietaryRestrictions?: string[];

  @ApiProperty({
    description: 'Accessibility requirements',
    type: [String],
    required: false,
    example: [
      'wheelchair accessible',
      'hearing assistance',
      'visual assistance',
    ],
  })
  @IsOptional()
  @IsArray({ message: 'Accessibility needs must be an array' })
  @IsString({ each: true, message: 'Each accessibility need must be a string' })
  accessibilityNeeds?: string[];
}

/**
 * Combined DTO for updating user profile and preferences
 */
export class UpdateUserDto extends UpdateProfileDto {
  @ApiProperty({
    description: 'User travel preferences and settings',
    type: UpdatePreferencesDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePreferencesDto)
  preferences?: UpdatePreferencesDto;
}
