import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GeocodeDto {
  @ApiProperty({
    description: 'Address to geocode',
    example: '1600 Amphitheatre Parkway, Mountain View, CA',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({
    description: 'Region code for biasing results (e.g., US, VN)',
    example: 'US',
  })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional({
    description: 'Language code for the response (e.g., en, vi)',
    example: 'en',
  })
  @IsString()
  @IsOptional()
  language?: string;
}
