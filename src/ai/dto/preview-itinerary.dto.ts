import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PreferenceDto {
  @ApiPropertyOptional({
    example: ['food', 'beach', 'coffee', 'local culture'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  interests?: string[];

  @ApiPropertyOptional({
    example: 'mid',
  })
  @IsOptional()
  @IsString()
  travelStyle?: string;
}

export class PreviewItineraryDto {
  @ApiProperty({
    example: 'Da Nang, Vietnam',
  })
  @IsString()
  @IsNotEmpty()
  destination!: string;

  @ApiPropertyOptional({
    example: '2025-12-20',
  })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2025-12-22',
  })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    example: 3000000,
  })
  @IsNumber()
  @IsOptional()
  budget?: number;

  @ApiPropertyOptional({
    example: 'VND',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    example: 2,
  })
  @IsNumber()
  @IsOptional()
  travelers?: number;

  @ApiPropertyOptional({
    type: PreferenceDto,
    example: {
      interests: ['food', 'beach', 'coffee'],
      travelStyle: 'mid',
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PreferenceDto)
  preferences?: PreferenceDto;
}
