import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  Validate,
  ValidateNested,
  IsArray,
  IsObject,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TripStatus } from '../enum/trip-enum';
import { EndAfterStartDateConstraint } from '../validators/end-after-start-date.validator';
import { CreateActivityDto } from 'src/activity/dto/create-activity.dto';
import { CreateItineraryDto } from 'src/itinerary/dto/create-itinerary.dto';

export class DestinationLocationDto {
  @ApiProperty({ example: 'ChIJx9Lr6t0udTERpL7gE3o0h1E' })
  @IsString()
  placeId!: string;

  @ApiProperty({ example: 'Da Nang' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Da Nang, Vietnam' })
  @IsString()
  address!: string;

  @ApiProperty({ example: 16.054407 })
  @IsNumber()
  lat!: number;

  @ApiProperty({ example: 108.202167 })
  @IsNumber()
  lng!: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: string[];
}

export class CreateActivityInput extends OmitType(CreateActivityDto, [
  'itineraryId',
  'destinationIds',
  'metadata',
] as const) {}

export class CreateItineraryInput extends OmitType(CreateItineraryDto, [
  'tripId',
  'aiGenerated',
  'userModified',
  'estimatedCost',
  'actualCost',
  'costBreakdown',
] as const) {
  @ApiPropertyOptional({ type: [CreateActivityInput] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateActivityInput)
  activities?: CreateActivityInput[];
}

export class CreateTripDto {
  @ApiProperty({
    description: 'Trip title',
    minLength: 3,
    maxLength: 255,
    example: 'Da Nang 3D2N - Food & Beach',
  })
  @IsString()
  @Length(3, 255)
  title!: string;

  @ApiPropertyOptional({
    description: 'Trip description',
    maxLength: 2000,
    example:
      'Quick weekend getaway focusing on local food, beach time, and cafes.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Primary destination name (optional)',
    example: 'Da Nang',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  destination?: string;

  @ApiPropertyOptional({
    description: 'Destination location object from Places API',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DestinationLocationDto)
  destinationLocation?: DestinationLocationDto;

  @ApiPropertyOptional({
    description: 'Existing destination id (UUID) to link as primaryDestination',
    example: '33333333-3333-3333-3333-333333333333',
  })
  @IsOptional()
  @IsUUID()
  primaryDestinationId?: string;

  @ApiPropertyOptional({
    description: 'Timezone, e.g. Asia/Ho_Chi_Minh',
    example: 'Asia/Ho_Chi_Minh',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Start date (YYYY-MM-DD)',
    type: String,
    example: '2025-12-20',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (YYYY-MM-DD)',
    type: String,
    example: '2025-12-22',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
  @Validate(EndAfterStartDateConstraint)
  endDate?: string;

  @ApiPropertyOptional({ description: 'Budget amount', example: 3000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({
    description: '3-letter currency code',
    example: 'VND',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiPropertyOptional({ enum: TripStatus, default: TripStatus.PLANNING })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @ApiPropertyOptional({
    description: 'Is trip publicly visible',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @ApiPropertyOptional({ description: 'Enable cost tracking', default: true })
  @IsOptional()
  @IsBoolean()
  enableCostTracking?: boolean;

  @ApiPropertyOptional({
    type: [CreateItineraryInput],
    description: 'Itineraries with nested activities to create with the trip',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateItineraryInput)
  itineraries?: CreateItineraryInput[];
}
