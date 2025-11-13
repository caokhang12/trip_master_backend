import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { AmadeusModule } from '../integrations/amadeus/amadeus.module';

@Module({
  imports: [AmadeusModule],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
