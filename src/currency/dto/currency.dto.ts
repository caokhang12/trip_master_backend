import { IsString, IsNumber, IsOptional, Min, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for currency conversion requests
 */
export class CurrencyConversionDto {
  @ApiProperty({
    description: 'Amount to convert',
    example: 100,
    required: true,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Source currency code (ISO 4217)',
    example: 'USD',
    required: true,
  })
  @IsString()
  @Length(3, 3)
  from: string;

  @ApiProperty({
    description: 'Target currency code (ISO 4217)',
    example: 'VND',
    required: true,
  })
  @IsString()
  @Length(3, 3)
  to: string;
}

/**
 * DTO for exchange rates requests
 */
export class ExchangeRatesDto {
  @ApiProperty({
    description: 'Base currency code (ISO 4217)',
    example: 'USD',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  base?: string = 'USD';

  @ApiProperty({
    description:
      'Target currencies to get rates for (comma-separated string or array)',
    example: 'VND,EUR,GBP,JPY',
    required: false,
  })
  @IsOptional()
  currencies?: string | string[];
}

/**
 * Response DTO for currency conversion
 */
export class CurrencyConversionResponseDto {
  @ApiProperty({
    description: 'Source currency code',
    example: 'USD',
  })
  from: string;

  @ApiProperty({
    description: 'Target currency code',
    example: 'VND',
  })
  to: string;

  @ApiProperty({
    description: 'Original amount',
    example: 100,
  })
  amount: number;

  @ApiProperty({
    description: 'Converted amount',
    example: 2435050,
  })
  convertedAmount: number;

  @ApiProperty({
    description: 'Exchange rate used',
    example: 24350.5,
  })
  exchangeRate: number;

  @ApiProperty({
    description: 'Formatted amount with currency symbol',
    example: '2,435,050 ₫',
  })
  formattedAmount: string;

  @ApiProperty({
    description: 'Conversion timestamp',
    example: '2024-06-04T08:30:00Z',
  })
  conversionDate: string;
}

/**
 * Response DTO for exchange rates
 */
export class ExchangeRatesResponseDto {
  @ApiProperty({
    description: 'Base currency code',
    example: 'USD',
  })
  base: string;

  @ApiProperty({
    description: 'Rate date',
    example: '2024-06-04',
  })
  date: string;

  @ApiProperty({
    description: 'Exchange rates object',
    example: {
      VND: 24350.5,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 157.25,
    },
  })
  rates: Record<string, number>;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-06-04T08:30:00Z',
  })
  lastUpdated: string;

  @ApiProperty({
    description: 'Data source',
    example: 'exchangerate-api',
  })
  source: string;
}
