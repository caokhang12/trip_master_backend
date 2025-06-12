import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for budget breakdown by category
 */
export class BudgetBreakdownDto {
  @ApiPropertyOptional({
    description: 'Budget for accommodation expenses',
    example: 1000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accommodation?: number;

  @ApiPropertyOptional({
    description: 'Budget for food and dining expenses',
    example: 500,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  food?: number;

  @ApiPropertyOptional({
    description: 'Budget for transportation expenses',
    example: 300,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  transport?: number;

  @ApiPropertyOptional({
    description: 'Budget for activities and attractions',
    example: 400,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  activities?: number;

  @ApiPropertyOptional({
    description: 'Budget for shopping expenses',
    example: 200,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shopping?: number;

  @ApiPropertyOptional({
    description: 'Budget for miscellaneous expenses',
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  miscellaneous?: number;
}

/**
 * DTO for activity cost tracking
 */
export class ActivityCostDto {
  @ApiProperty({
    description: 'Type of cost for the activity',
    example: 'food',
    enum: [
      'transport',
      'food',
      'accommodation',
      'activity',
      'shopping',
      'miscellaneous',
    ],
  })
  @IsString()
  @IsIn([
    'transport',
    'food',
    'accommodation',
    'activity',
    'shopping',
    'miscellaneous',
  ])
  costType: string;

  @ApiProperty({
    description: 'Estimated cost amount',
    example: 25.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  estimatedAmount: number;

  @ApiPropertyOptional({
    description: 'Actual cost amount (to be filled by user)',
    example: 30.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualAmount?: number;

  @ApiProperty({
    description: 'Currency code for the cost',
    example: 'USD',
    maxLength: 3,
  })
  @IsString()
  @Length(3, 3)
  currency: string;

  @ApiPropertyOptional({
    description: 'Source of the cost estimate',
    example: 'ai_estimate',
  })
  @IsOptional()
  @IsString()
  costSource?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the cost',
    example: 'Includes tip for service',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for updating activity costs
 */
export class UpdateActivityCostDto {
  @ApiPropertyOptional({
    description: 'Actual amount spent on the activity',
    example: 32.5,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualAmount?: number;

  @ApiPropertyOptional({
    description: 'Notes about the actual spending',
    example: 'Cost was higher due to additional drinks',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for budget category breakdown
 */
export class BudgetCategoryDto {
  @ApiProperty({
    description: 'Budget category name',
    example: 'food',
  })
  category: string;

  @ApiProperty({
    description: 'Budgeted amount for this category',
    example: 500,
  })
  budgeted: number;

  @ApiProperty({
    description: 'Estimated cost based on activities',
    example: 480,
  })
  estimated: number;

  @ApiProperty({
    description: 'Actual amount spent',
    example: 520,
  })
  actual: number;

  @ApiProperty({
    description: 'Variance between actual and budgeted',
    example: 20,
  })
  variance: number;

  @ApiProperty({
    description: 'Budget utilization percentage',
    example: 104,
  })
  utilizationPercentage: number;
}

/**
 * DTO for budget summary response
 */
export class BudgetSummaryDto {
  @ApiProperty({
    description: 'Total trip budget',
    example: 3000,
  })
  totalBudget: number;

  @ApiProperty({
    description: 'Total amount spent',
    example: 2850,
  })
  totalSpent: number;

  @ApiProperty({
    description: 'Total estimated cost',
    example: 2950,
  })
  totalEstimated: number;

  @ApiProperty({
    description: 'Remaining budget',
    example: 150,
  })
  remainingBudget: number;

  @ApiProperty({
    description: 'Budget utilization percentage',
    example: 95,
  })
  budgetUtilization: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Breakdown by category',
    type: [BudgetCategoryDto],
  })
  categoryBreakdown: BudgetCategoryDto[];

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-06-12T10:30:00Z',
  })
  lastUpdated: Date;
}

/**
 * DTO for comprehensive cost analysis
 */
export class CostAnalysisDto {
  @ApiProperty({
    description: 'Trip ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tripId: string;

  @ApiProperty({
    description: 'Total trip budget',
    example: 3000,
  })
  totalBudget: number;

  @ApiProperty({
    description: 'Total estimated cost',
    example: 2950,
  })
  totalEstimated: number;

  @ApiProperty({
    description: 'Total actual spending',
    example: 2850,
  })
  totalSpent: number;

  @ApiProperty({
    description: 'Remaining budget',
    example: 150,
  })
  remainingBudget: number;

  @ApiProperty({
    description: 'Budget variance (positive = over budget)',
    example: -150,
  })
  budgetVariance: number;

  @ApiProperty({
    description: 'Budget utilization percentage',
    example: 95,
  })
  utilizationPercentage: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Category breakdown',
    type: [BudgetCategoryDto],
  })
  categoryBreakdown: BudgetCategoryDto[];

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-06-12T10:30:00Z',
  })
  lastUpdated: Date;
}

/**
 * DTO for updating trip budget breakdown
 */
export class UpdateBudgetDto {
  @ApiProperty({
    description: 'Budgeted amount for the category',
    example: 600,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  budgetedAmount: number;
}
