import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TravelStyle } from '../../shared/types/base-response.types';

/**
 * DTO for budget range
 */
export class BudgetRangeDto {
  @IsNumber({}, { message: 'Minimum budget must be a number' })
  @Min(0, { message: 'Minimum budget must be greater than or equal to 0' })
  min: number;

  @IsNumber({}, { message: 'Maximum budget must be a number' })
  @Min(0, { message: 'Maximum budget must be greater than or equal to 0' })
  max: number;

  @IsString({ message: 'Currency must be a string' })
  currency: string;
}

/**
 * DTO for updating user profile
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  lastName?: string;

  @IsOptional()
  @IsString({ message: 'Avatar URL must be a string' })
  avatarUrl?: string;
}

/**
 * DTO for updating user preferences
 */
export class UpdatePreferencesDto {
  @IsOptional()
  @IsArray({ message: 'Travel style must be an array' })
  @IsEnum(TravelStyle, {
    each: true,
    message: 'Each travel style must be a valid option',
  })
  travelStyle?: TravelStyle[];

  @IsOptional()
  @ValidateNested()
  @Type(() => BudgetRangeDto)
  budgetRange?: BudgetRangeDto;

  @IsOptional()
  @IsArray({ message: 'Interests must be an array' })
  @IsString({ each: true, message: 'Each interest must be a string' })
  interests?: string[];

  @IsOptional()
  @IsArray({ message: 'Dietary restrictions must be an array' })
  @IsString({
    each: true,
    message: 'Each dietary restriction must be a string',
  })
  dietaryRestrictions?: string[];

  @IsOptional()
  @IsArray({ message: 'Accessibility needs must be an array' })
  @IsString({ each: true, message: 'Each accessibility need must be a string' })
  accessibilityNeeds?: string[];
}

/**
 * Combined DTO for updating user profile and preferences
 */
export class UpdateUserDto extends UpdateProfileDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePreferencesDto)
  preferences?: UpdatePreferencesDto;
}
