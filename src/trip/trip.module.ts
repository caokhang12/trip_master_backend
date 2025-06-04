import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripController, PublicTripController } from './trip.controller';
import { TripService } from './trip.service';
import { ItineraryService } from './itinerary.service';
import { TripEntity } from '../schemas/trip.entity';
import { ItineraryEntity } from '../schemas/itinerary.entity';
import { TripShareEntity } from '../schemas/trip-share.entity';

/**
 * Trip module containing trip management services and controllers
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TripEntity, ItineraryEntity, TripShareEntity]),
  ],
  controllers: [TripController, PublicTripController],
  providers: [TripService, ItineraryService],
  exports: [TripService, ItineraryService],
})
export class TripModule {}
