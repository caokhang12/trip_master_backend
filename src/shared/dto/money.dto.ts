import {
  IsNumber,
  IsOptional,
  Min,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Base money/budget validation with positive amount
 */
export class MoneyDto {
  @ApiProperty({
    description: 'Amount in the specified currency',
    example: 1500.5,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0, { message: 'Amount must be at least 0' })
  amount: number;
}

/**
 * Optional money/budget validation
 */
export class OptionalMoneyDto {
  @ApiPropertyOptional({
    description: 'Amount in the specified currency',
    example: 1500.5,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0, { message: 'Amount must be at least 0' })
  amount?: number;
}

/**
 * Budget range validation with min and max amounts
 */
export class BudgetRangeDto {
  @ApiProperty({
    description: 'Minimum budget amount',
    example: 500,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Minimum budget must be a number' })
  @Min(0, { message: 'Minimum budget must be greater than or equal to 0' })
  minBudget: number;

  @ApiProperty({
    description: 'Maximum budget amount',
    example: 5000,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Maximum budget must be a number' })
  @Min(0, { message: 'Maximum budget must be greater than or equal to 0' })
  maxBudget: number;
}

/**
 * Trip budget DTO with currency support
 */
export class TripBudgetDto {
  @ApiPropertyOptional({
    description: 'Total budget for the trip in the specified currency',
    example: 3000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Budget must be a number' })
  @Min(0, { message: 'Budget must be at least 0' })
  budget?: number;

  @ApiPropertyOptional({
    description: 'Currency code for the budget (ISO 4217)',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  currency?: string = 'USD';
}

/**
 * Currency amount DTO for conversions and exchanges
 */
export class CurrencyAmountDto {
  @ApiProperty({
    description: 'Amount to convert',
    example: 100.5,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  amount: number;

  @ApiProperty({
    description: 'Source currency code (ISO 4217)',
    example: 'USD',
  })
  fromCurrency: string;

  @ApiProperty({
    description: 'Target currency code (ISO 4217)',
    example: 'VND',
  })
  toCurrency: string;
}

/**
 * User-friendly budget range with currency (for user preferences)
 */
export class UserBudgetRangeDto {
  @ApiProperty({
    description: 'Minimum budget amount',
    example: 500,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Minimum budget must be a number' })
  @Min(0, { message: 'Minimum budget must be greater than or equal to 0' })
  min: number;

  @ApiProperty({
    description: 'Maximum budget amount',
    example: 2000,
    minimum: 0,
  })
  @Type(() => Number)
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
