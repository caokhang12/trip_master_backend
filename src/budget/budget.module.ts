import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripBudgetEntity } from 'src/schemas/trip-budget.entity';
import { BudgetItemEntity } from 'src/schemas/budget-item.entity';
import { BudgetService } from './budget.service';
import { BudgetController } from './budget.controller';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TripBudgetEntity, BudgetItemEntity]),
    RedisModule,
  ],
  controllers: [BudgetController],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetModule {}
