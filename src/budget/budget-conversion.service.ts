import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TripBudgetEntity } from 'src/schemas/trip-budget.entity';
import { BudgetItemEntity } from 'src/schemas/budget-item.entity';
import { CurrencyService } from 'src/currency/services/currency.service';
import { BudgetAuditService } from './budget-audit.service';
import { BudgetAuditAction } from 'src/schemas/budget-audit-log.entity';

@Injectable()
export class BudgetConversionService {
  constructor(
    @InjectRepository(TripBudgetEntity)
    private budgetRepo: Repository<TripBudgetEntity>,
    @InjectRepository(BudgetItemEntity)
    private itemRepo: Repository<BudgetItemEntity>,
    private currencyService: CurrencyService,
    private auditService: BudgetAuditService,
    private dataSource: DataSource,
  ) {}

  async convertBudgetCurrency(
    budgetId: string,
    newCurrency: string,
  ): Promise<TripBudgetEntity> {
    const budget = await this.budgetRepo.findOne({
      where: { id: budgetId },
      relations: ['items'],
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    if (budget.currency === newCurrency) {
      return budget; // No conversion needed
    }

    const oldCurrency = budget.currency;

    // Get exchange rate
    const conversion = await this.currencyService.convertCurrency(
      1,
      oldCurrency,
      newCurrency,
    );
    const exchangeRate = conversion.convertedAmount;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Convert budget amounts
      const newTotalBudget = Number(budget.totalBudget) * exchangeRate;
      const newSpentAmount = Number(budget.spentAmount) * exchangeRate;

      await queryRunner.manager.update(
        TripBudgetEntity,
        { id: budgetId },
        {
          totalBudget: newTotalBudget,
          spentAmount: newSpentAmount,
          currency: newCurrency,
        },
      );

      // Convert all budget items
      for (const item of budget.items) {
        const newAmount = Number(item.amount) * exchangeRate;
        await queryRunner.manager.update(
          BudgetItemEntity,
          { id: item.id },
          { amount: newAmount },
        );
      }

      await queryRunner.commitTransaction();

      // Log conversion
      await this.auditService.logAction(
        budgetId,
        BudgetAuditAction.UPDATE_BUDGET,
        {
          currency: oldCurrency,
          totalBudget: budget.totalBudget,
          spentAmount: budget.spentAmount,
        },
        {
          currency: newCurrency,
          totalBudget: newTotalBudget,
          spentAmount: newSpentAmount,
          exchangeRate,
        },
        `Currency converted from ${oldCurrency} to ${newCurrency} at rate ${exchangeRate.toFixed(4)}`,
      );

      return (await this.budgetRepo.findOne({
        where: { id: budgetId },
        relations: ['items'],
      })) as TripBudgetEntity;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(
        `Failed to convert budget currency: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
