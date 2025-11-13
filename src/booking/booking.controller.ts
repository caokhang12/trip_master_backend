import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { ResponseUtil } from '../shared/utils/response.util';
import { CreateHotelOrderDto } from './dto/create-hotel-order.dto';

@ApiTags('Booking')
@ApiBearerAuth()
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('hotels/order')
  @ApiOperation({ summary: 'Create hotel booking (Amadeus)' })
  @ApiResponse({ status: 201, description: 'Hotel order created' })
  async createHotelOrder(@Body() dto: CreateHotelOrderDto) {
    const data = await this.bookingService.createHotelOrder(dto);
    return ResponseUtil.success(data);
  }
}
