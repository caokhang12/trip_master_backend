import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripBudgetEntity } from 'src/schemas/trip-budget.entity';
import { BudgetItemEntity } from 'src/schemas/budget-item.entity';
import { BudgetAuditLogEntity } from 'src/schemas/budget-audit-log.entity';
import { RefreshTokenEntity } from 'src/schemas/refresh-token.entity';
import { BudgetService } from './budget.service';
import { BudgetController } from './budget.controller';
import { BudgetAuditService } from './budget-audit.service';
import { BudgetConversionService } from './budget-conversion.service';
import { RedisModule } from 'src/redis/redis.module';
import { CurrencyModule } from 'src/currency/currency.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TripBudgetEntity,
      BudgetItemEntity,
      BudgetAuditLogEntity,
      RefreshTokenEntity,
    ]),
    RedisModule,
    CurrencyModule,
  ],
  controllers: [BudgetController],
  providers: [BudgetService, BudgetAuditService, BudgetConversionService],
  exports: [BudgetService, BudgetAuditService, BudgetConversionService],
})
export class BudgetModule {}
