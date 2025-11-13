import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBudgetDto {
  @IsUUID()
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  tripId: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({
    example: 5000000,
    description:
      'Total budget amount in smallest currency unit or decimals depending on currency',
  })
  totalBudget: number;

  @IsString()
  @Length(3, 3)
  @IsOptional()
  @ApiPropertyOptional({ example: 'VND' })
  currency?: string = 'VND';

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  @ApiPropertyOptional({
    example: 0.8,
    description: 'Fraction of budget used to trigger notification (0..1)',
  })
  notifyThreshold?: number = 0.8;
}
