import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripController, PublicTripController } from './trip.controller';
import { TripService } from './trip.service';
import { ItineraryService } from './itinerary.service';
import { TripEntity } from '../schemas/trip.entity';
import { ItineraryEntity } from '../schemas/itinerary.entity';
import { TripShareEntity } from '../schemas/trip-share.entity';
import { ActivityCostEntity } from '../schemas/activity-cost.entity';
import { BudgetTrackingEntity } from '../schemas/budget-tracking.entity';
import { LocationModule } from '../location/location.module';
import { CurrencyModule } from '../currency/currency.module';
import { CountryModule } from '../shared/services/country.module';
import { SharedModule } from '../shared/shared.module';

/**
 * Trip module containing trip management services and controllers
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      TripEntity,
      ItineraryEntity,
      TripShareEntity,
      ActivityCostEntity,
      BudgetTrackingEntity,
    ]),
    LocationModule,
    CurrencyModule,
    CountryModule,
    SharedModule,
  ],
  controllers: [TripController, PublicTripController],
  providers: [TripService, ItineraryService],
  exports: [TripService, ItineraryService],
})
export class TripModule {}
