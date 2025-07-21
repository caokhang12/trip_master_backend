import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LocationController } from './location.controller';
import { LocationService } from './services/location.service';
import { CacheService } from '../shared/services/cache.service';

@Module({
  imports: [ConfigModule],
  controllers: [LocationController],
  providers: [LocationService, CacheService],
})
export class LocationModule {}
