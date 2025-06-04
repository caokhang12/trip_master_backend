import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { LocationController } from './location.controller';
import { LocationService } from './services/location.service';
import { WeatherService } from './services/weather.service';
import { DestinationEntity } from './entities/destination.entity';
import { VietnamLocationEntity } from './entities/vietnam-location.entity';
import { APIThrottleService } from '../shared/services/api-throttle.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DestinationEntity, VietnamLocationEntity]),
    ConfigModule,
  ],
  controllers: [LocationController],
  providers: [LocationService, WeatherService, APIThrottleService],
  exports: [LocationService, WeatherService, APIThrottleService],
})
export class LocationModule {}
