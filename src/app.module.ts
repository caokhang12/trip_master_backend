import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import amadeusConfig from './config/amadeus.config';
import googleMapsConfig from './config/google-maps.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { EmailModule } from './email/email.module';
import { UserModule } from './users/user.module';
import { LocationModule } from './location/location.module';
import { CurrencyModule } from './currency/currency.module';
import { UploadModule } from './upload/upload.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { GlobalValidationPipe } from './shared/pipes/global-validation.pipe';
import { TripModule } from './trip/trip.module';
import { AuthModule } from './auth/auth.module';
import { ActivityModule } from './activity/activity.module';
import { ItineraryModule } from './itinerary/itinerary.module';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { HotelsModule } from './hotels/hotels.module';
import { TransportModule } from './transport/transport.module';
import { BookingModule } from './booking/booking.module';
import { BudgetModule } from './budget/budget.module';
import { PreferencesModule } from './preferences/preferences.module';
import { GoogleMapsModule } from './integrations/google-maps/google-maps.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [amadeusConfig, googleMapsConfig],
    }),
    SharedModule,
    EmailModule,
    UserModule,
    LocationModule,
    CurrencyModule,
    UploadModule,
    TripModule,
    AuthModule,
    ActivityModule,
    ItineraryModule,
    HotelsModule,
    TransportModule,
    BookingModule,
    BudgetModule,
    PreferencesModule,
    GoogleMapsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: GlobalValidationPipe,
    },

    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
