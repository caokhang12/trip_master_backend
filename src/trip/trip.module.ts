import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripEntity } from '../schemas/trip.entity';
import { TripService } from './trip.service';
import { TripController } from './trip.controller';
import { TripRepository } from './trip.repository';

@Module({
  imports: [TypeOrmModule.forFeature([TripEntity])],
  controllers: [TripController],
  providers: [TripService, TripRepository],
  exports: [TripService, TripRepository],
})
export class TripModule {}
