import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityEntity } from 'src/schemas/activity.entity';
import { ActivityDestinationEntity } from 'src/schemas/activity-destination.entity';
import { ItineraryEntity } from 'src/schemas/itinerary.entity';
import { ActivityRepository } from './activity.repository';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { RefreshTokenEntity } from 'src/schemas/refresh-token.entity';
import { DestinationEntity } from 'src/schemas/destination.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActivityEntity,
      ActivityDestinationEntity,
      ItineraryEntity,
      DestinationEntity,
      RefreshTokenEntity,
    ]),
  ],
  controllers: [ActivityController],
  providers: [ActivityRepository, ActivityService],
  exports: [ActivityService, ActivityRepository],
})
export class ActivityModule {}
