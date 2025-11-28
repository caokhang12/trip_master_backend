import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
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

export class DistanceMatrixDto {
  @ApiProperty({
    description: 'Array of origin coordinates',
    type: [LocationDto],
    example: [{ lat: 37.4224764, lng: -122.0842499 }],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  origins: LocationDto[];

  @ApiProperty({
    description: 'Array of destination coordinates',
    type: [LocationDto],
    example: [
      { lat: 37.4267861, lng: -122.0806032 },
      { lat: 37.4323453, lng: -122.0877643 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  destinations: LocationDto[];

  @ApiPropertyOptional({
    description: 'Travel mode',
    enum: ['driving', 'walking', 'bicycling', 'transit'],
    default: 'driving',
  })
  @IsOptional()
  @IsEnum(['driving', 'walking', 'bicycling', 'transit'])
  mode?: 'driving' | 'walking' | 'bicycling' | 'transit';

  @ApiPropertyOptional({
    description: 'Language code for the response',
    example: 'en',
  })
  @IsOptional()
  language?: string;
}
