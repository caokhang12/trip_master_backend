import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityCategory } from 'src/trip/enum/trip-enum';

export class CreateBudgetItemDto {
  @IsUUID()
  @ApiProperty({ example: '8d6f3b45-1f2a-4c6b-a7d5-9b0a12345678' })
  tripBudgetId: string;

  @IsEnum(ActivityCategory)
  @ApiProperty({ example: ActivityCategory.FOOD })
  category: ActivityCategory;

  @IsNumber()
  @Min(0)
  @ApiProperty({
    example: 150000,
    description: 'Amount in the budget currency',
  })
  amount: number;

  @IsString()
  @Length(1, 20)
  @IsOptional()
  @ApiPropertyOptional({ example: 'manual' })
  source?: string;

  @IsString()
  @Length(1, 255)
  @IsOptional()
  @ApiPropertyOptional({ example: 'txn_20251106_01' })
  refId?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Lunch near train station' })
  note?: string;
}
