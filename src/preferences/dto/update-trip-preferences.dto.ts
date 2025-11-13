import { IsArray, IsOptional, IsString, IsEnum } from 'class-validator';
import { TravelStyle } from 'src/shared/types/base-response.types';

export class UpdateTripPreferencesDto {
  @IsOptional()
  @IsArray()
  @IsEnum(TravelStyle, { each: true })
  inferredStyle?: TravelStyle[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dominantActivities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  foodStyle?: string[];

  @IsOptional()
  // free-form object, validated at business rules level if needed
  weatherAdjustedPreferences?: Record<string, unknown>;

  @IsOptional()
  customPreferences?: Record<string, unknown>;
}
