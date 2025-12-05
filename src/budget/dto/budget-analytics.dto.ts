export class BudgetBreakdownDto {
  category: string;
  amount: number;
  itemCount: number;
  percentageOfTotal: number;
}

export class BudgetAnalyticsDto {
  tripId: string;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  currency: string;
  breakdown: BudgetBreakdownDto[];
  createdAt: Date;
  updatedAt: Date;
}
