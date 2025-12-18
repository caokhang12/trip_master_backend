import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Single item for bulk update - optimized for reorder/move operations
 */
export class BulkUpdateActivityItemDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Activity ID to update',
  })
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'New itinerary ID (for moving activity to another day)',
  })
  @IsOptional()
  @IsUUID()
  itineraryId?: string;

  @ApiPropertyOptional({
    type: 'integer',
    description: 'New order index within the itinerary',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'New time (HH:mm)',
  })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiPropertyOptional({
    description: 'New title',
  })
  @IsOptional()
  @IsString()
  title?: string;
}

export class BulkUpdateActivitiesDto {
  @ApiProperty({
    type: [BulkUpdateActivityItemDto],
    description: 'Array of activities to update',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateActivityItemDto)
  activities!: BulkUpdateActivityItemDto[];
}
