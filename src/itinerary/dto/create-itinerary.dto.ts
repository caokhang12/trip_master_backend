import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  Min,
  Matches,
  Validate,
} from 'class-validator';
import { WithinTripRangeConstraint } from '../validators/within-trip-range.validator';

export class CreateItineraryDto {
  @ApiProperty({
    format: 'uuid',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID()
  @IsNotEmpty()
  tripId!: string;

  @ApiProperty({
    maxLength: 255,
    example: 'Day 1 - Food & Beach',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: 1, description: 'Day index within the trip (>=1)' })
  @IsInt()
  @Min(1)
  dayNumber!: number;

  @ApiProperty({ example: '2025-12-20' })
  @ApiPropertyOptional({ format: 'date', description: 'YYYY-MM-DD' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/)
  @Validate(WithinTripRangeConstraint)
  date?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  aiGenerated?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  userModified?: boolean = false;

  @ApiPropertyOptional({
    type: 'number',
    minimum: 0,
    default: 0,
    example: 1200000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @ApiPropertyOptional({ type: 'number', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualCost?: number;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  costBreakdown?: Record<string, number>;
}
