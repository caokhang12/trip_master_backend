import { IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Base date range DTO for trip dates
 */
export class DateRangeDto {
  @ApiProperty({
    description: 'Start date in ISO 8601 format',
    example: '2024-03-15',
    format: 'date',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date in ISO 8601 format (must be after start date)',
    example: '2024-03-22',
    format: 'date',
  })
  @IsDateString()
  endDate: string;
}

/**
 * Optional date range DTO for search and filters
 */
export class OptionalDateRangeDto {
  @ApiPropertyOptional({
    description: 'Start date in ISO 8601 format',
    example: '2024-03-15',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date in ISO 8601 format (must be after start date)',
    example: '2024-03-22',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * Single date DTO for specific date requirements
 */
export class SingleDateDto {
  @ApiProperty({
    description: 'Date in ISO 8601 format',
    example: '2024-03-15',
    format: 'date',
  })
  @IsDateString()
  date: string;
}

/**
 * Optional single date DTO for optional date fields
 */
export class OptionalSingleDateDto {
  @ApiPropertyOptional({
    description: 'Date in ISO 8601 format',
    example: '2024-03-15',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
