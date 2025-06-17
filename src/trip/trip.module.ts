import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripController } from './trip.controller';
import { PublicTripController } from './public-trip.controller';
import { ItineraryController } from './itinerary.controller';
import { CostTrackingController } from './cost-tracking.controller';
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
import { UploadModule } from '../upload/upload.module';

/**
 * Modular trip module with separated controllers for better maintainability
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
    UploadModule,
  ],
  controllers: [
    TripController,
    PublicTripController,
    ItineraryController,
    CostTrackingController,
  ],
  providers: [TripService, ItineraryService],
  exports: [TripService, ItineraryService],
})
export class TripModule {}
