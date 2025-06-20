import {
  IsBoolean,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GeneratedItineraryDto } from './ai-response.dto';

/**
 * DTO for saving generated AI itinerary
 */
export class SaveGeneratedItineraryDto {
  @ApiProperty({
    description: 'Whether to save the itinerary to database',
    example: true,
  })
  @IsBoolean()
  saveToDatabase: boolean;

  @ApiProperty({
    description: 'Generated itinerary data to save',
    type: GeneratedItineraryDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => GeneratedItineraryDto)
  itinerary: GeneratedItineraryDto;

  @ApiPropertyOptional({
    description: 'Optional notes about the itinerary',
    example: 'Custom modifications made by user',
  })
  @IsOptional()
  @IsObject()
  notes?: string;
}

/**
 * Response DTO for save itinerary operation
 */
export class SaveItineraryResponseDto {
  @ApiProperty({
    description: 'Whether the itinerary was saved to database',
    example: true,
  })
  saved: boolean;

  @ApiProperty({
    description: 'Message about the operation',
    example: 'Itinerary saved successfully',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Database itinerary IDs if saved',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  itineraryIds?: string[];
}
