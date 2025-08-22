import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripEntity } from '../schemas/trip.entity';
import { TripImageEntity } from '../schemas/trip-image.entity';
import { TripService } from './trip.service';
import { TripController } from './trip.controller';
import { TripRepository } from './trip.repository';
import { TripImageRepository } from './images/trip-image.repository';
import { TripImageService } from './images/trip-image.service';
import { TripImageController } from './images/trip-image.controller';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TripEntity, TripImageEntity]),
    UploadModule,
  ],
  controllers: [TripController, TripImageController],
  providers: [
    TripService,
    TripRepository,
    TripImageRepository,
    TripImageService,
  ],
  exports: [TripService, TripRepository, TripImageRepository, TripImageService],
})
export class TripModule {}
