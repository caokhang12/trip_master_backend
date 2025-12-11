import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripEntity } from '../schemas/trip.entity';
import { DestinationEntity } from '../schemas/destination.entity';
import { TripImageEntity } from '../schemas/trip-image.entity';
import { TripMemberEntity } from '../schemas/trip-member.entity';
import { TripInvitationEntity } from '../schemas/trip-invitation.entity';
import { TripActivityLogEntity } from '../schemas/trip-activity-log.entity';
import { UserEntity } from '../schemas/user.entity';
import { RefreshTokenEntity } from '../schemas/refresh-token.entity';
import { TripService } from './trip.service';
import { TripController } from './trip.controller';
import { TripRepository } from './trip.repository';
import { TripImageRepository } from './images/trip-image.repository';
import { TripImageService } from './images/trip-image.service';
import { TripImageController } from './images/trip-image.controller';
import { TripCollaborationService } from './trip-collaboration.service';
import { TripCollaborationController } from './trip-collaboration.controller';
import { TripPermissionGuard } from './guards/trip-permission.guard';
import { UploadModule } from '../upload/upload.module';
import { ItineraryModule } from '../itinerary/itinerary.module';
import { ActivityModule } from '../activity/activity.module';
import { EmailModule } from '../email/email.module';
import { DestinationModule } from '../destinations/destination.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TripEntity,
      TripImageEntity,
      DestinationEntity,
      TripMemberEntity,
      TripInvitationEntity,
      TripActivityLogEntity,
      UserEntity,
      RefreshTokenEntity,
    ]),
    UploadModule,
    DestinationModule,
    ItineraryModule,
    ActivityModule,
    EmailModule,
  ],
  controllers: [
    TripController,
    TripImageController,
    TripCollaborationController,
  ],
  providers: [
    TripService,
    TripRepository,
    TripImageRepository,
    TripImageService,
    TripCollaborationService,
    TripPermissionGuard,
  ],
  exports: [
    TripService,
    TripRepository,
    TripImageRepository,
    TripImageService,
    TripCollaborationService,
  ],
})
export class TripModule {}
