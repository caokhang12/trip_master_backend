import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HotelsService } from './hotels.service';
import { ResponseUtil } from '../shared/utils/response.util';
import {
  getHotelOffersDto,
  getHotelsByCityDto,
} from 'src/hotels/dto/request/search-hotels.dto';

@ApiTags('Hotels')
@ApiBearerAuth()
@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotels: HotelsService) {}

  @Get('getHotelsByCity')
  @ApiOperation({ summary: 'Search hotel offers (Amadeus)' })
  @ApiResponse({ status: 200 })
  async search(@Query() query: getHotelsByCityDto) {
    const data = await this.hotels.getHotelList(query);
    return ResponseUtil.success(data);
  }

  @Get('getHotelOffers')
  @ApiOperation({ summary: 'Get hotel offers (Amadeus)' })
  @ApiResponse({ status: 200 })
  async getOffers(@Query() query: getHotelOffersDto) {
    console.log('Received getHotelOffers request with query:', query);
    const data = await this.hotels.getHotelOffers(query);
    return ResponseUtil.success(data);
  }
}
