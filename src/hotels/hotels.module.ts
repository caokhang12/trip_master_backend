import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HotelsController } from './hotels.controller';
import { HotelsService } from './hotels.service';
import { RedisModule } from '../redis/redis.module';
import { AmadeusModule } from '../integrations/amadeus/amadeus.module';

@Module({
  imports: [TypeOrmModule.forFeature([]), AmadeusModule, RedisModule],
  controllers: [HotelsController],
  providers: [HotelsService],
})
export class HotelsModule {}
