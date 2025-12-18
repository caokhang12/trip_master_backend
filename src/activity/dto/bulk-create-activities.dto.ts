import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { ActivityCategory } from 'src/trip/enum/trip-enum';
import type { GeneratedActivity } from 'src/ai/dto/generated-itinerary.dto';

export class BulkCreateActivityItemDto {
  @ApiProperty({ example: '09:00', description: 'HH:mm (24h)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  time!: string;

  @ApiProperty({ maxLength: 255, example: 'Try Mi Quang for breakfast' })
  @IsString()
  @Length(1, 255)
  title!: string;

  @ApiProperty({ required: false, maxLength: 5000 })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'minutes' })
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  duration?: number | null;

  @ApiProperty({ required: false, type: 'number', example: 12.5 })
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  cost?: number | null;

  @ApiProperty({ required: false, enum: ActivityCategory })
  @IsOptional()
  @IsEnum(ActivityCategory)
  type?: ActivityCategory | null;

  @ApiProperty({ required: false, type: 'integer', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderIndex?: number;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  metadata?: Record<string, any> | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  poi?: GeneratedActivity['poi'];

  @ApiProperty({
    required: false,
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

export class BulkCreateActivitiesDto {
  @ApiProperty({
    format: 'uuid',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsUUID()
  @IsNotEmpty()
  itineraryId!: string;

  @ApiProperty({ type: [BulkCreateActivityItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  activities!: BulkCreateActivityItemDto[];
}
