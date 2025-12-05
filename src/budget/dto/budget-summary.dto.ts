export class BudgetSummaryDto {
  tripId: string;
  totalBudget: number;
  spentAmount: number;
  remainingBudget: number;
  percentageUsed: number;
  currency: string;
  notifyThreshold: number;
  itemCount: number;
  isThresholdExceeded: boolean;
  createdAt: Date;
  updatedAt: Date;
}
