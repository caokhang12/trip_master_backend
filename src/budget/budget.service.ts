import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TripBudgetEntity } from 'src/schemas/trip-budget.entity';
import { BudgetItemEntity } from 'src/schemas/budget-item.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { CreateBudgetItemDto } from './dto/create-item.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { BudgetSummaryDto } from './dto/budget-summary.dto';
import {
  BudgetAnalyticsDto,
  BudgetBreakdownDto,
} from './dto/budget-analytics.dto';
import { RedisCacheService } from 'src/redis/redis-cache.service';
import { BudgetAuditService } from './budget-audit.service';
import { BudgetAuditAction } from 'src/schemas/budget-audit-log.entity';

@Injectable()
export class BudgetService {
  private readonly SUMMARY_TTL_SECONDS = 300; // 5 minutes
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    @InjectRepository(TripBudgetEntity)
    private readonly budgetRepo: Repository<TripBudgetEntity>,
    @InjectRepository(BudgetItemEntity)
    private readonly itemRepo: Repository<BudgetItemEntity>,
    private readonly redis: RedisCacheService,
    private readonly dataSource: DataSource,
    private readonly auditService: BudgetAuditService,
  ) {}

  async getByTripId(tripId: string): Promise<TripBudgetEntity | null> {
    return this.budgetRepo.findOne({
      where: { tripId },
      relations: ['items'],
      order: { createdAt: 'ASC' },
    });
  }

  async createBudget(dto: CreateBudgetDto): Promise<TripBudgetEntity> {
    const existing = await this.budgetRepo.findOne({
      where: { tripId: dto.tripId },
    });
    if (existing)
      throw new BadRequestException('Budget already exists for this trip');
    const entity = this.budgetRepo.create({
      tripId: dto.tripId,
      totalBudget: dto.totalBudget,
      currency: dto.currency ?? 'VND',
      notifyThreshold: dto.notifyThreshold ?? 0.8,
      spentAmount: 0,
    });
    const saved = await this.budgetRepo.save(entity);

    // Log budget creation
    await this.auditService.logAction(
      saved.id,
      BudgetAuditAction.CREATE_BUDGET,
      undefined,
      {
        tripId: saved.tripId,
        totalBudget: saved.totalBudget,
        currency: saved.currency,
        notifyThreshold: saved.notifyThreshold,
      },
      `Budget created for trip ${saved.tripId}`,
    );

    await this.updateSummaryCache(saved.tripId);
    return saved;
  }

  async addItem(dto: CreateBudgetItemDto): Promise<BudgetItemEntity> {
    const budget = await this.budgetRepo.findOne({
      where: { id: dto.tripBudgetId },
      relations: ['items'],
    });
    if (!budget) throw new NotFoundException('Trip budget not found');

    // Validate amount is positive
    if (dto.amount <= 0) {
      throw new BadRequestException('Expense amount must be greater than 0');
    }

    // Calculate new total spending
    const currentSpent = Number(budget.spentAmount);
    const newSpent = currentSpent + Number(dto.amount);

    // Validate spending doesn't exceed budget
    if (newSpent > Number(budget.totalBudget)) {
      const difference = newSpent - Number(budget.totalBudget);
      throw new BadRequestException(
        `Cannot add this expense. Adding ${dto.amount} would exceed budget by ${difference.toFixed(2)} ${budget.currency}. Current: ${currentSpent} / ${budget.totalBudget}`,
      );
    }

    // Use transaction for atomic update
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const item = this.itemRepo.create({
        tripBudgetId: dto.tripBudgetId,
        category: dto.category,
        amount: dto.amount,
        source: dto.source,
        refId: dto.refId,
        note: dto.note,
      });
      const saved = await queryRunner.manager.save(item);

      // Update spent amount atomically
      await queryRunner.manager.update(
        TripBudgetEntity,
        { id: budget.id },
        { spentAmount: newSpent },
      );

      await queryRunner.commitTransaction();

      // Check if spending exceeded threshold and trigger notification
      const thresholdAmount =
        Number(budget.totalBudget) * Number(budget.notifyThreshold);
      if (newSpent >= thresholdAmount) {
        await this.triggerThresholdAlert(budget, newSpent);
      }

      // Log item addition
      await this.auditService.logAction(
        budget.id,
        BudgetAuditAction.ADD_ITEM,
        undefined,
        {
          itemId: saved.id,
          category: saved.category,
          amount: saved.amount,
          newSpentTotal: newSpent,
        },
        `Added ${saved.category} expense of ${dto.amount} ${budget.currency}`,
      );

      await this.updateSummaryCache(budget.tripId);
      this.logger.log(
        `Added expense item ${saved.id}: ${dto.amount} ${budget.currency}`,
      );
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to add budget item: ${error}`, error);
      throw new BadRequestException('Failed to add expense item');
    } finally {
      await queryRunner.release();
    }
  }

  async updateBudget(
    id: string,
    dto: UpdateBudgetDto,
  ): Promise<TripBudgetEntity> {
    const budget = await this.budgetRepo.findOne({ where: { id } });
    if (!budget) throw new NotFoundException('Trip budget not found');

    // Store previous values for audit
    const previousValue = {
      totalBudget: budget.totalBudget,
      currency: budget.currency,
      notifyThreshold: budget.notifyThreshold,
    };

    const updates: Partial<TripBudgetEntity> = {};
    if (dto.totalBudget !== undefined) updates.totalBudget = dto.totalBudget;
    if (dto.currency !== undefined) updates.currency = dto.currency;
    if (dto.notifyThreshold !== undefined)
      updates.notifyThreshold = dto.notifyThreshold;

    await this.budgetRepo.update(id, updates);
    const updated = await this.budgetRepo.findOne({ where: { id } });

    // Log budget update
    await this.auditService.logAction(
      id,
      BudgetAuditAction.UPDATE_BUDGET,
      previousValue,
      {
        totalBudget: updated?.totalBudget,
        currency: updated?.currency,
        notifyThreshold: updated?.notifyThreshold,
      },
      `Budget updated`,
    );

    await this.updateSummaryCache(budget.tripId);
    return updated!;
  }

  async deleteItem(itemId: string): Promise<{ deleted: true }> {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Budget item not found');
    const budget = await this.budgetRepo.findOne({
      where: { id: item.tripBudgetId },
    });
    if (!budget) throw new NotFoundException('Trip budget not found');

    await this.itemRepo.delete(itemId);
    const nextSpent = Math.max(
      0,
      Number(budget.spentAmount) - Number(item.amount),
    );
    await this.budgetRepo.update(budget.id, { spentAmount: nextSpent });

    // Log item deletion
    await this.auditService.logAction(
      budget.id,
      BudgetAuditAction.DELETE_ITEM,
      {
        itemId: item.id,
        category: item.category,
        amount: item.amount,
      },
      { newSpentTotal: nextSpent },
      `Deleted ${item.category} expense of ${item.amount} ${budget.currency}`,
    );

    await this.updateSummaryCache(budget.tripId);
    this.logger.log(`Deleted budget item ${itemId}: ${item.amount} removed`);
    return { deleted: true };
  }

  /**
   * Get budget summary with percentages and remaining amount
   */
  async getBudgetSummary(tripId: string): Promise<BudgetSummaryDto> {
    const budget = await this.getByTripId(tripId);
    if (!budget) {
      throw new NotFoundException('Budget not found for this trip');
    }

    const spentAmount = Number(budget.spentAmount);
    const totalBudget = Number(budget.totalBudget);
    const remainingBudget = totalBudget - spentAmount;
    const percentageUsed =
      totalBudget > 0 ? (spentAmount / totalBudget) * 100 : 0;
    const isThresholdExceeded =
      percentageUsed >= Number(budget.notifyThreshold) * 100;

    return {
      tripId: budget.tripId,
      totalBudget,
      spentAmount,
      remainingBudget,
      percentageUsed: parseFloat(percentageUsed.toFixed(2)),
      currency: budget.currency,
      notifyThreshold: Number(budget.notifyThreshold),
      itemCount: budget.items?.length ?? 0,
      isThresholdExceeded,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  }

  /**
   * Get budget analytics with breakdown by category
   */
  async getBudgetAnalytics(tripId: string): Promise<BudgetAnalyticsDto> {
    const budget = await this.getByTripId(tripId);
    if (!budget) {
      throw new NotFoundException('Budget not found for this trip');
    }

    const totalSpent = Number(budget.spentAmount);
    const totalBudget = Number(budget.totalBudget);

    // Group items by category and calculate totals
    const categoryMap = new Map<string, { amount: number; count: number }>();

    if (budget.items) {
      for (const item of budget.items) {
        const existing = categoryMap.get(item.category);
        if (existing) {
          existing.amount += Number(item.amount);
          existing.count += 1;
        } else {
          categoryMap.set(item.category, {
            amount: Number(item.amount),
            count: 1,
          });
        }
      }
    }

    // Convert to breakdown DTOs
    const breakdown: BudgetBreakdownDto[] = Array.from(
      categoryMap.entries(),
    ).map(([category, data]) => ({
      category,
      amount: parseFloat(data.amount.toFixed(2)),
      itemCount: data.count,
      percentageOfTotal:
        totalSpent > 0
          ? parseFloat(((data.amount / totalSpent) * 100).toFixed(2))
          : 0,
    }));

    return {
      tripId: budget.tripId,
      totalBudget,
      totalSpent,
      remainingBudget: totalBudget - totalSpent,
      currency: budget.currency,
      breakdown: breakdown.sort((a, b) => b.amount - a.amount),
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  }

  private async updateSummaryCache(tripId: string): Promise<void> {
    const budget = await this.budgetRepo.findOne({
      where: { tripId },
      relations: ['items'],
    });
    if (!budget) return;
    const summary = {
      tripId,
      spentAmount: Number(budget.spentAmount),
      itemsCount: budget.items?.length ?? 0,
      currency: budget.currency,
      updatedAt: new Date().toISOString(),
    };
    await this.redis.set(
      `budget:summary:${tripId}`,
      summary,
      this.SUMMARY_TTL_SECONDS,
    );
  }

  /**
   * Trigger alert when spending exceeds threshold
   * This method can be extended to send emails, push notifications, etc.
   */
  private async triggerThresholdAlert(
    budget: TripBudgetEntity,
    spentAmount: number,
  ): Promise<void> {
    const thresholdAmount =
      Number(budget.totalBudget) * Number(budget.notifyThreshold);
    const percentageUsed = (
      (spentAmount / Number(budget.totalBudget)) *
      100
    ).toFixed(2);
    const remaining = Number(budget.totalBudget) - spentAmount;

    const alertKey = `budget:alert:${budget.id}`;
    const lastAlertTime = (await this.redis.get(alertKey)) as string;

    // Only alert once per hour to avoid spamming
    if (!lastAlertTime) {
      this.logger.warn(
        `Budget threshold alert: Trip ${budget.tripId} has spent ${spentAmount} ${budget.currency} (${percentageUsed}%) of total ${budget.totalBudget}. Remaining: ${remaining.toFixed(2)}`,
      );

      // Log threshold alert
      await this.auditService.logAction(
        budget.id,
        BudgetAuditAction.THRESHOLD_ALERT,
        undefined,
        {
          spentAmount,
          thresholdAmount,
          percentageUsed,
          remaining,
        },
        `Budget threshold of ${(Number(budget.notifyThreshold) * 100).toFixed(0)}% exceeded`,
      );

      // Cache alert to prevent duplicate notifications
      await this.redis.set(alertKey, 'true', 3600); // 1 hour

      // TODO: Integrate with email/notification service
      // await this.notificationService.sendBudgetAlert({
      //   tripId: budget.tripId,
      //   spentAmount,
      //   totalBudget: budget.totalBudget,
      //   currency: budget.currency,
      //   percentageUsed,
      //   remaining,
      // });
    }
  }
}
