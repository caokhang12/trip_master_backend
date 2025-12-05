import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripBudgetEntity } from 'src/schemas/trip-budget.entity';
import { BudgetItemEntity } from 'src/schemas/budget-item.entity';
import { BudgetAuditLogEntity } from 'src/schemas/budget-audit-log.entity';
import { BudgetService } from './budget.service';
import { BudgetController } from './budget.controller';
import { BudgetAuditService } from './budget-audit.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TripBudgetEntity,
      BudgetItemEntity,
      BudgetAuditLogEntity,
    ]),
    RedisModule,
  ],
  controllers: [BudgetController],
  providers: [BudgetService, BudgetAuditService],
  exports: [BudgetService, BudgetAuditService],
})
export class BudgetModule {}
