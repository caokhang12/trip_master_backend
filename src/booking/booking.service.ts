import { Injectable } from '@nestjs/common';
import { AmadeusApiService } from '../integrations/amadeus/amadeus-api.service';
import { CreateHotelOrderDto } from './dto/create-hotel-order.dto';

@Injectable()
export class BookingService {
  constructor(private readonly amadeus: AmadeusApiService) {}

  async createHotelOrder(dto: CreateHotelOrderDto): Promise<unknown> {
    // Amadeus expects payload under { data: { ... } } and dto.data already contains the required structure
    return await this.amadeus.createHotelBooking(
      dto.data as unknown as Record<string, unknown>,
    );
  }
}
