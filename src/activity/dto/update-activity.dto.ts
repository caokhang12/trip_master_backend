import { PartialType } from '@nestjs/swagger';
import { CreateActivityDto } from './create-activity.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID, ArrayUnique } from 'class-validator';

export class UpdateActivityDto extends PartialType(CreateActivityDto) {
  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Replace destination mappings with these IDs',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  destinationIds?: string[];
}
