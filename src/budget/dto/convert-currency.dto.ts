import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, Length } from 'class-validator';

export class ConvertCurrencyDto {
  @ApiProperty({
    description: 'Target currency code (ISO 4217)',
    example: 'VND',
    enum: [
      'VND',
      'USD',
      'EUR',
      'GBP',
      'JPY',
      'THB',
      'SGD',
      'AUD',
      'CAD',
      'CNY',
      'KRW',
    ],
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  @IsIn([
    'VND',
    'USD',
    'EUR',
    'GBP',
    'JPY',
    'THB',
    'SGD',
    'AUD',
    'CAD',
    'CNY',
    'KRW',
  ])
  newCurrency: string;
}
