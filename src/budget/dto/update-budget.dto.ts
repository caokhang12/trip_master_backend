import {
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBudgetDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({ example: 6000000 })
  totalBudget?: number;

  @IsString()
  @Length(3, 3)
  @IsOptional()
  @ApiPropertyOptional({ example: 'VND' })
  currency?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  @ApiPropertyOptional({ example: 0.85 })
  notifyThreshold?: number;
}
