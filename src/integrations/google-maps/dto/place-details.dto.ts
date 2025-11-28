import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class PlaceDetailsParamDto {
  @ApiProperty({
    description: 'Google Place ID',
    example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  })
  @IsString()
  @IsNotEmpty()
  placeId: string;
}

export class PlaceDetailsQueryDto {
  @ApiPropertyOptional({
    description: 'Language code for the response (e.g., en, vi)',
    example: 'en',
  })
  @IsString()
  language?: string;
}
