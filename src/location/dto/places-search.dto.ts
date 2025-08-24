import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class PlacesQuery {
  @ApiPropertyOptional({
    description: 'Text query for place search (name, type, etc.)',
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Latitude for location biasing' })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : parseFloat(String(value)),
  )
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude for location biasing' })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : parseFloat(String(value)),
  )
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({
    description: 'Radius in meters for nearby weighting (bias, not strict)',
    default: 5000,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : parseInt(String(value), 10),
  )
  @IsNumber()
  @Min(100)
  @Max(50000)
  radius?: number = 5000;

  @ApiPropertyOptional({ description: 'Max results to return', default: 10 })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : parseInt(String(value), 10),
  )
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 10;
}
