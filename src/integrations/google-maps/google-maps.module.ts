import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleMapsController } from './google-maps.controller';
import { PlacesService } from './services/places.service';
import { PlacesSearchService } from './services/places-search.service';
import { GeocodingService } from './services/geocoding.service';
import { ReverseGeocodingService } from './services/reverse-geocoding.service';
import { DirectionsService } from './services/directions.service';
import { DistanceMatrixService } from './services/distance-matrix.service';
import { RedisModule } from '../../redis/redis.module';
import { CacheService } from '../../shared/services/cache.service';
import { APIThrottleService } from '../../shared/services/api-throttle.service';

@Module({
  imports: [ConfigModule, RedisModule],
  controllers: [GoogleMapsController],
  providers: [
    PlacesService,
    PlacesSearchService,
    GeocodingService,
    ReverseGeocodingService,
    DirectionsService,
    DistanceMatrixService,
    CacheService,
    APIThrottleService,
  ],
  exports: [
    PlacesService,
    PlacesSearchService,
    GeocodingService,
    ReverseGeocodingService,
    DirectionsService,
    DistanceMatrixService,
  ],
})
export class GoogleMapsModule {}
