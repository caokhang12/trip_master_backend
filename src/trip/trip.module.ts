import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import controllers from organized structure
import {
  TripController,
  PublicTripController,
  ItineraryController,
  CostTrackingController,
  TripAIController,
} from './controllers';

// Import services from organized structure
import { TripService, ItineraryService } from './services';

// Import admin controllers and services
import { AdminTripController } from './admin/admin-trip.controller';
import { AdminTripService } from './admin/admin-trip.service';
import { TripEntity } from '../schemas/trip.entity';
import { ItineraryEntity } from '../schemas/itinerary.entity';
import { TripShareEntity } from '../schemas/trip-share.entity';
import { ActivityCostEntity } from '../schemas/activity-cost.entity';
import { BudgetTrackingEntity } from '../schemas/budget-tracking.entity';
import { UserEntity } from '../schemas/user.entity';
import { LocationModule } from '../location/location.module';
import { CurrencyModule } from '../currency/currency.module';
import { SharedModule } from '../shared/shared.module';
import { UploadModule } from '../upload/upload.module';
import { AIModule } from '../ai/ai.module';

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
      UserEntity,
    ]),
    LocationModule,
    CurrencyModule,
    SharedModule,
    UploadModule,
    AIModule,
  ],
  controllers: [
    TripController,
    PublicTripController,
    ItineraryController,
    CostTrackingController,
    TripAIController,
    AdminTripController,
  ],
  providers: [TripService, ItineraryService, AdminTripService],
  exports: [TripService, ItineraryService, AdminTripService],
})
export class TripModule {}
