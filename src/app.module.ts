import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './users/user.module';
import { TripModule } from './trip/trip.module';
import { LocationModule } from './location/location.module';
import { CurrencyModule } from './currency/currency.module';
import { CountryModule } from './shared/services/country.module';
import { DatabaseModule } from './database/database.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { GlobalValidationPipe } from './shared/pipes/global-validation.pipe';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    SharedModule,
    AuthModule,
    UserModule,
    TripModule,
    LocationModule,
    CurrencyModule,
    CountryModule,
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
  ],
})
export class AppModule {}
