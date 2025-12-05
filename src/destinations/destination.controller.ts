import { Controller, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DestinationService } from './destination.service';
import { ResolveDestinationDto } from './dto/resolve-destination.dto';
import { ResponseUtil } from '../shared/utils/response.util';

@ApiTags('Destinations')
@Controller('destinations')
@ApiBearerAuth()
export class DestinationController {
  constructor(private readonly destService: DestinationService) {}

  @Post('resolve')
  @ApiOperation({
    summary: 'Resolve or create a Destination from placeId or coords',
  })
  @ApiResponse({ status: 200, description: 'Destination resolved/created' })
  async resolve(@Body() dto: ResolveDestinationDto) {
    const dest = await this.destService.resolve(dto);
    return ResponseUtil.success(dest);
  }
}
