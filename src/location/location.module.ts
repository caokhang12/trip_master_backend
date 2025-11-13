import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LocationController } from './location.controller';
import { LocationService } from './services/location.service';
import { CacheService } from '../shared/services/cache.service';
import { GooglePlacesService } from './services/google-places.service';
import { RedisModule } from '../redis/redis.module';
import { APIThrottleService } from '../shared/services/api-throttle.service';

@Module({
  imports: [ConfigModule, RedisModule],
  controllers: [LocationController],
  providers: [
    LocationService,
    CacheService,
    GooglePlacesService,
    APIThrottleService,
  ],
})
export class LocationModule {}
