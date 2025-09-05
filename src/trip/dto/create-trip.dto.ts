import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';
import { TripStatus } from '../enum/trip-enum';
import { EndAfterStartDateConstraint } from '../validators/end-after-start-date.validator';

export class CreateTripDto {
  @ApiProperty({ description: 'Trip title', minLength: 3, maxLength: 255 })
  @IsString()
  @Length(3, 255)
  title: string;

  @ApiPropertyOptional({ description: 'Trip description', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Timezone, e.g. Asia/Ho_Chi_Minh' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)', type: String })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)', type: String })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
  @Validate(EndAfterStartDateConstraint)
  endDate?: string;

  @ApiPropertyOptional({ description: 'Budget amount', example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({
    description: '3-letter currency code',
    example: 'USD',
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
}
