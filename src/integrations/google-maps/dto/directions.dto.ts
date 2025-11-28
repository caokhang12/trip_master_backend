import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

class LocationDto {
  @ApiProperty({
    description: 'Latitude',
    example: 37.4224764,
  })
  @Transform(({ value }) => parseFloat(String(value)))
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({
    description: 'Longitude',
    example: -122.0842499,
  })
  @Transform(({ value }) => parseFloat(String(value)))
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class DirectionsDto {
  @ApiProperty({
    description: 'Starting point coordinates',
    type: LocationDto,
  })
  @ValidateNested()
  @Type(() => LocationDto)
  origin: LocationDto;

  @ApiProperty({
    description: 'Ending point coordinates',
    type: LocationDto,
  })
  @ValidateNested()
  @Type(() => LocationDto)
  destination: LocationDto;

  @ApiPropertyOptional({
    description: 'Array of waypoint coordinates',
    type: [LocationDto],
    example: [
      { lat: 37.4267861, lng: -122.0806032 },
      { lat: 37.4323453, lng: -122.0877643 },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  waypoints?: LocationDto[];

  @ApiPropertyOptional({
    description: 'Travel mode',
    enum: ['driving', 'walking', 'bicycling', 'transit'],
    default: 'driving',
  })
  @IsOptional()
  @IsEnum(['driving', 'walking', 'bicycling', 'transit'])
  mode?: 'driving' | 'walking' | 'bicycling' | 'transit';

  @ApiPropertyOptional({
    description: 'Whether to avoid tolls',
    example: false,
  })
  @IsOptional()
  avoid?: 'tolls' | 'highways' | 'ferries';

  @ApiPropertyOptional({
    description: 'Language code for the response',
    example: 'en',
  })
  @IsString()
  @IsOptional()
  language?: string;
}
