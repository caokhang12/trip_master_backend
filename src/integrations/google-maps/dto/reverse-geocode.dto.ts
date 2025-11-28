import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReverseGeocodeDto {
  @ApiProperty({
    description: 'Latitude',
    example: 37.4224764,
    minimum: -90,
    maximum: 90,
  })
  @Transform(({ value }) => parseFloat(String(value)))
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({
    description: 'Longitude',
    example: -122.0842499,
    minimum: -180,
    maximum: 180,
  })
  @Transform(({ value }) => parseFloat(String(value)))
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiPropertyOptional({
    description: 'Language code for the response (e.g., en, vi)',
    example: 'en',
  })
  @IsString()
  @IsOptional()
  language?: string;
}
