import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PreferenceDto {
  @IsOptional()
  @IsArray()
  interests?: string[];

  @IsOptional()
  @IsString()
  travelStyle?: string;
}

export class PreviewItineraryDto {
  @IsString()
  @IsNotEmpty()
  destination: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  budget?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  travelers?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PreferenceDto)
  preferences?: PreferenceDto;
}
