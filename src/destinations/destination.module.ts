import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DestinationEntity } from '../schemas/destination.entity';
import { DestinationService } from './destination.service';
import { DestinationController } from './destination.controller';
import { GoogleMapsModule } from '../integrations/google-maps/google-maps.module';

@Module({
  imports: [TypeOrmModule.forFeature([DestinationEntity]), GoogleMapsModule],
  controllers: [DestinationController],
  providers: [DestinationService],
  exports: [DestinationService],
})
export class DestinationModule {}
