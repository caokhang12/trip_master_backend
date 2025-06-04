import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsObject,
  ValidateNested,
  IsNotEmpty,
  MaxLength,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  IsISO8601,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TripStatus, DestinationCoords } from '../../schemas/trip.entity';
import { Activity } from '../../schemas/itinerary.entity';

export class DestinationCoordsDto {
  @IsNumber({}, { message: 'Latitude must be a number' })
  @Min(-90, { message: 'Latitude must be at least -90' })
  @Max(90, { message: 'Latitude must be at most 90' })
  lat: number;

  @IsNumber({}, { message: 'Longitude must be a number' })
  @Min(-180, { message: 'Longitude must be at least -180' })
  @Max(180, { message: 'Longitude must be at most 180' })
  lng: number;
}

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  destinationName: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DestinationCoordsDto)
  destinationCoords?: DestinationCoords;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Budget must be a number' })
  @Min(0, { message: 'Budget must be at least 0' })
  budget?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  destinationName?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DestinationCoordsDto)
  destinationCoords?: DestinationCoords;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Budget must be a number' })
  @Min(0, { message: 'Budget must be at least 0' })
  budget?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class TripQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must be at most 100' })
  limit?: number = 10;

  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class ActivityDto {
  @IsString()
  @IsNotEmpty()
  time: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Duration must be a number' })
  @Min(0, { message: 'Duration must be at least 0' })
  duration?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Cost must be a number' })
  @Min(0, { message: 'Cost must be at least 0' })
  cost?: number;

  @IsOptional()
  @IsString()
  type?: string;
}

export class CreateItineraryDto {
  @IsNumber({}, { message: 'Day number must be a number' })
  @Min(1, { message: 'Day number must be at least 1' })
  dayNumber: number;

  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ActivityDto)
  activities: Activity[];
}

export class UpdateItineraryDto {
  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ActivityDto)
  activities: Activity[];

  @IsOptional()
  @IsBoolean()
  userModified?: boolean;
}

export class GenerateItineraryDto {
  @IsOptional()
  @IsString()
  preferences?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  budgetPreference?: string;
}

export class ShareTripDto {
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class TripSearchDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(50, { message: 'Limit must be at most 50' })
  limit?: number = 10;
}
