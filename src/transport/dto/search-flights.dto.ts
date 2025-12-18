import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class SearchFlightsDto {
  @ApiProperty({ description: 'Origin airport IATA code', example: 'SGN' })
  @IsString()
  @Length(3, 5)
  originLocationCode!: string;

  @ApiProperty({ description: 'Destination airport IATA code', example: 'HAN' })
  @IsString()
  @Length(3, 5)
  destinationLocationCode!: string;

  @ApiProperty({
    description: 'Departure date (YYYY-MM-DD)',
    example: '2025-12-20',
  })
  @IsDateString()
  departureDate!: string;

  @ApiProperty({
    description: 'Return date (YYYY-MM-DD)',
    required: false,
    example: '2025-12-22',
  })
  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @ApiProperty({ description: 'Number of adults', example: 1 })
  @IsInt()
  @Min(1)
  adults!: number;

  @ApiProperty({
    description: 'Non-stop flights only',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  nonStop?: boolean;
}
