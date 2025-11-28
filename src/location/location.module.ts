import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LocationController } from './location.controller';
import { LocationService } from './services/location.service';
import { CacheService } from '../shared/services/cache.service';
import { RedisModule } from '../redis/redis.module';
import { APIThrottleService } from '../shared/services/api-throttle.service';
import { GoogleMapsModule } from '../integrations/google-maps/google-maps.module';

@Module({
  imports: [ConfigModule, RedisModule, GoogleMapsModule],
  controllers: [LocationController],
  providers: [LocationService, CacheService, APIThrottleService],
  exports: [LocationService],
})
export class LocationModule {}
