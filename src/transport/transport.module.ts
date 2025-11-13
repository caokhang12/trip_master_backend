import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransportController } from './transport.controller';
import { TransportService } from './transport.service';
import { RedisModule } from '../redis/redis.module';
import { AmadeusModule } from '../integrations/amadeus/amadeus.module';

@Module({
  imports: [TypeOrmModule.forFeature([]), AmadeusModule, RedisModule],
  controllers: [TransportController],
  providers: [TransportService],
})
export class TransportModule {}
