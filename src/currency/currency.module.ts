import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './services/currency.service';
import { APIThrottleService } from '../shared/services/api-throttle.service';

@Module({
  imports: [ConfigModule],
  controllers: [CurrencyController],
  providers: [CurrencyService, APIThrottleService],
  exports: [CurrencyService, APIThrottleService],
})
export class CurrencyModule {}
