import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityEntity } from 'src/schemas/activity.entity';
import { ActivityDestinationEntity } from 'src/schemas/activity-destination.entity';
import { ItineraryEntity } from 'src/schemas/itinerary.entity';
import { ActivityRepository } from './activity.repository';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActivityEntity,
      ActivityDestinationEntity,
      ItineraryEntity,
    ]),
  ],
  controllers: [ActivityController],
  providers: [ActivityRepository, ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
