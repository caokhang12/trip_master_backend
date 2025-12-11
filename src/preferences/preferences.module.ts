import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPreferencesEntity } from 'src/schemas/user-preferences.entity';
import { TripPreferencesEntity } from 'src/schemas/trip-preferences.entity';
import { UserEntity } from 'src/schemas/user.entity';
import { TripEntity } from 'src/schemas/trip.entity';
import { RefreshTokenEntity } from 'src/schemas/refresh-token.entity';
import { PreferencesService } from 'src/preferences/preferences.service';
import { TripPreferencesController } from 'src/preferences/trip-preferences.controller';
import { UserPreferencesController } from 'src/preferences/user-preferences.controller';
import { PreferencesMergerService } from 'src/preferences/preferences-merger.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserPreferencesEntity,
      TripPreferencesEntity,
      UserEntity,
      TripEntity,
      RefreshTokenEntity,
    ]),
  ],
  controllers: [UserPreferencesController, TripPreferencesController],
  providers: [PreferencesService, PreferencesMergerService],
  exports: [PreferencesService, PreferencesMergerService],
})
export class PreferencesModule {}
