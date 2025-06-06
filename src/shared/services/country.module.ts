import { Module } from '@nestjs/common';
import { LocationModule } from '../../location/location.module';
import { CurrencyModule } from '../../currency/currency.module';
import { CountryService } from './country.service';
import { CountryDefaultsService } from './country-defaults.service';
import { APIThrottleService } from './api-throttle.service';
import { ErrorUtilService } from '../utils/error.util';

/**
 * Country module containing country-related services
 * This module imports LocationModule and CurrencyModule to resolve dependencies
 */
@Module({
  imports: [LocationModule, CurrencyModule],
  providers: [
    CountryService,
    CountryDefaultsService,
    APIThrottleService,
    ErrorUtilService,
  ],
  exports: [
    CountryService,
    CountryDefaultsService,
    APIThrottleService,
    ErrorUtilService,
  ],
})
export class CountryModule {}
