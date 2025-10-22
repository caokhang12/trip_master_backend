import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { EmailModule } from './email/email.module';
import { UserModule } from './users/user.module';
import { LocationModule } from './location/location.module';
import { CurrencyModule } from './currency/currency.module';
import { UploadModule } from './upload/upload.module';
import { AIModule } from './ai/ai.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { GlobalValidationPipe } from './shared/pipes/global-validation.pipe';
import { TripModule } from './trip/trip.module';
import { AuthModule } from './auth/auth.module';
import { ActivityModule } from './activity/activity.module';
import { ItineraryModule } from './itinerary/itinerary.module';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SharedModule,
    EmailModule,
    UserModule,
    LocationModule,
    CurrencyModule,
    UploadModule,
    AIModule,
    TripModule,
    AuthModule,
    ActivityModule,
    ItineraryModule,
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
