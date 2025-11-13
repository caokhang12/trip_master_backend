import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripBudgetEntity } from 'src/schemas/trip-budget.entity';
import { BudgetItemEntity } from 'src/schemas/budget-item.entity';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { CreateBudgetItemDto } from './dto/create-item.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { RedisCacheService } from 'src/redis/redis-cache.service';

@Injectable()
export class BudgetService {
  private readonly SUMMARY_TTL_SECONDS = 300; // 5 minutes

  constructor(
    @InjectRepository(TripBudgetEntity)
    private readonly budgetRepo: Repository<TripBudgetEntity>,
    @InjectRepository(BudgetItemEntity)
    private readonly itemRepo: Repository<BudgetItemEntity>,
    private readonly redis: RedisCacheService,
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
    await this.updateSummaryCache(saved.tripId);
    return saved;
  }

  async addItem(dto: CreateBudgetItemDto): Promise<BudgetItemEntity> {
    const budget = await this.budgetRepo.findOne({
      where: { id: dto.tripBudgetId },
    });
    if (!budget) throw new NotFoundException('Trip budget not found');

    const item = this.itemRepo.create({
      tripBudgetId: dto.tripBudgetId,
      category: dto.category,
      amount: dto.amount,
      source: dto.source,
      refId: dto.refId,
      note: dto.note,
    });
    const saved = await this.itemRepo.save(item);

    // update spent
    const nextSpent = Number(budget.spentAmount) + Number(dto.amount);
    await this.budgetRepo.update(budget.id, { spentAmount: nextSpent });

    await this.updateSummaryCache(budget.tripId);
    return saved;
  }

  async updateBudget(
    id: string,
    dto: UpdateBudgetDto,
  ): Promise<TripBudgetEntity> {
    const budget = await this.budgetRepo.findOne({ where: { id } });
    if (!budget) throw new NotFoundException('Trip budget not found');

    const updates: Partial<TripBudgetEntity> = {};
    if (dto.totalBudget !== undefined) updates.totalBudget = dto.totalBudget;
    if (dto.currency !== undefined) updates.currency = dto.currency;
    if (dto.notifyThreshold !== undefined)
      updates.notifyThreshold = dto.notifyThreshold;

    await this.budgetRepo.update(id, updates);
    const updated = await this.budgetRepo.findOne({ where: { id } });
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
    await this.updateSummaryCache(budget.tripId);
    return { deleted: true };
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
}
