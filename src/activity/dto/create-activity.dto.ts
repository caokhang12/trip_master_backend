import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  ArrayUnique,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';
import { ActivityCategory } from 'src/trip/enum/trip-enum';
import type { GeneratedActivity } from 'src/ai/dto/generated-itinerary.dto';

export class CreateActivityDto {
  @ApiProperty({
    format: 'uuid',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsUUID()
  @IsNotEmpty()
  itineraryId!: string;

  @ApiProperty({ example: '09:00', description: 'HH:mm (24h)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  time!: string;

  @ApiProperty({ maxLength: 255, example: 'Visit My Khe Beach' })
  @IsString()
  @Length(1, 255)
  title!: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'minutes', example: 90 })
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  duration?: number | null;

  @ApiPropertyOptional({ type: 'number', example: 12.5 })
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  cost?: number | null;

  @ApiPropertyOptional({
    enum: ActivityCategory,
    example: ActivityCategory.SIGHTSEEING,
  })
  @IsOptional()
  @IsEnum(ActivityCategory)
  type?: ActivityCategory | null;

  @ApiPropertyOptional({ type: 'integer', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Arbitrary key-value metadata',
  })
  @IsOptional()
  metadata?: Record<string, any> | null;

  @ApiPropertyOptional({
    description: 'Optional POI snapshot (thin) to persist into activity.poi',
    nullable: true,
  })
  @IsOptional()
  poi?: GeneratedActivity['poi'];

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Destination IDs to link',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  destinationIds?: string[];
}
