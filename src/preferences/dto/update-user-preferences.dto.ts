import {
  IsArray,
  IsOptional,
  ValidateNested,
  IsNumber,
  IsString,
  Min,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TravelStyle } from 'src/shared/types/base-response.types';

class BudgetRangeDto {
  @IsNumber()
  @Min(0)
  min: number;

  @IsNumber()
  @Min(0)
  max: number;

  @IsString()
  currency: string;
}

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsArray()
  @IsEnum(TravelStyle, { each: true })
  travelStyle?: TravelStyle[];

  @IsOptional()
  @ValidateNested()
  @Type(() => BudgetRangeDto)
  budgetRange?: BudgetRangeDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryRestrictions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accessibilityNeeds?: string[];
}
