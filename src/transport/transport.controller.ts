import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TransportService } from './transport.service';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { ResponseUtil } from '../shared/utils/response.util';

@ApiTags('Flights')
@ApiBearerAuth()
@Controller('flights')
export class TransportController {
  constructor(private readonly transport: TransportService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search flight offers (Amadeus)' })
  @ApiResponse({ status: 200 })
  async search(@Query() query: SearchFlightsDto) {
    const data = await this.transport.searchFlights(query);
    return ResponseUtil.success(data);
  }
}
