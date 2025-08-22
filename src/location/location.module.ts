import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LocationController } from './location.controller';
import { LocationService } from './services/location.service';
import { CacheService } from '../shared/services/cache.service';
import { GooglePlacesService } from './services/google-places.service';
import { RedisCacheService } from '../shared/services/redis-cache.service';
import { APIThrottleService } from '../shared/services/api-throttle.service';

@Module({
  imports: [ConfigModule],
  controllers: [LocationController],
  providers: [
    LocationService,
    CacheService,
    GooglePlacesService,
    RedisCacheService,
    APIThrottleService,
  ],
})
export class LocationModule {}
