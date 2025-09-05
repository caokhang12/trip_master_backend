import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItineraryEntity } from 'src/schemas/itinerary.entity';
import { TripEntity } from 'src/schemas/trip.entity';
import { ItineraryRepository } from './itinerary.repository';
import { ItineraryService } from './itinerary.service';
import { ItineraryController } from './itinerary.controller';
import { WithinTripRangeConstraint } from './validators/within-trip-range.validator';
import { DateMatchesDayNumberConstraint } from './validators/date-matches-day-number.validator';

@Module({
  imports: [TypeOrmModule.forFeature([ItineraryEntity, TripEntity])],
  controllers: [ItineraryController],
  providers: [
    ItineraryRepository,
    ItineraryService,
    WithinTripRangeConstraint,
    DateMatchesDayNumberConstraint,
  ],
  exports: [ItineraryService],
})
export class ItineraryModule {}
