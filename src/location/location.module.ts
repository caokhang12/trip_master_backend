import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { LocationController } from './location.controller';
import { LocationService } from './services/location.service';
import { GoongApiService } from './services/goong-api.service';
import { NominatimApiService } from './services/nominatim-api.service';
import { WeatherService } from './services/weather.service';
import { DestinationEntity } from '../schemas/destination.entity';
import { VietnamLocationEntity } from '../schemas/vietnam-location.entity';
import { APIThrottleService } from '../shared/services/api-throttle.service';
import { CacheService } from '../shared/services/cache.service';
import { VietnamDetectorUtil } from '../shared/utils/vietnam-detector.util';
import { ErrorUtilService } from '../shared/utils/error.util';
import { PaginationUtilService } from '../shared/utils/pagination.util';

@Module({
  imports: [
    TypeOrmModule.forFeature([DestinationEntity, VietnamLocationEntity]),
    ConfigModule,
  ],
  controllers: [LocationController],
  providers: [
    // Main consolidated service
    LocationService,

    // API services
    GoongApiService,
    NominatimApiService,
    WeatherService,

    // Utility services
    APIThrottleService,
    CacheService,
    VietnamDetectorUtil,
    ErrorUtilService,
    PaginationUtilService,
  ],
  exports: [
    // Export main service as the single interface
    LocationService,

    // Export API and utility services for other modules
    GoongApiService,
    NominatimApiService,
    WeatherService,
    APIThrottleService,
    CacheService,
    VietnamDetectorUtil,
    ErrorUtilService,
    PaginationUtilService,
  ],
})
export class LocationModule {}
