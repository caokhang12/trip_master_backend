import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchLocationDto {
  @ApiProperty({
    description: 'Search query (place name or address)',
    example: 'Ho Chi Minh City',
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(String(value)))
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class ReverseGeocodeRequest {
  @ApiProperty({
    description: 'Latitude',
    example: 10.776889,
  })
  @Transform(({ value }) => parseFloat(String(value)))
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({
    description: 'Longitude',
    example: 106.695557,
  })
  @Transform(({ value }) => parseFloat(String(value)))
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}
