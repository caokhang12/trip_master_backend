import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ItineraryService } from './itinerary.service';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
import { BaseResponse } from 'src/shared/types/base-response.types';
import { ResponseUtil } from 'src/shared/utils/response.util';

interface RequestWithUser extends Request {
  user: { id: string };
}

@ApiTags('Itineraries')
@ApiBearerAuth()
@Controller('itineraries')
export class ItineraryController {
  constructor(private readonly service: ItineraryService) {}

  @ApiOperation({ summary: 'Create itinerary for a trip the user owns' })
  @Post()
  async create(
    @Req() req: RequestWithUser,
    @Body() dto: CreateItineraryDto,
  ): Promise<BaseResponse<any>> {
    const created = await this.service.create(req.user.id, dto);
    return ResponseUtil.success(created);
  }

  @ApiOperation({
    summary: 'List itineraries for current user, optionally by trip',
  })
  @ApiQuery({ name: 'tripId', required: false })
  @Get()
  async list(
    @Req() req: RequestWithUser,
    @Query('tripId') tripId?: string,
  ): Promise<BaseResponse<any>> {
    const items = await this.service.listForUser(req.user.id, tripId);
    return ResponseUtil.success(items);
  }

  @ApiOperation({ summary: 'Get itinerary' })
  @Get(':id')
  async getOne(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<BaseResponse<any>> {
    const item = await this.service.getOne(req.user.id, id);
    return ResponseUtil.success(item);
  }

  @ApiOperation({ summary: 'Update itinerary' })
  @Put(':id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateItineraryDto,
  ): Promise<BaseResponse<any>> {
    const updated = await this.service.update(req.user.id, id, dto);
    return ResponseUtil.success(updated);
  }

  @ApiOperation({ summary: 'Delete itinerary' })
  @Delete(':id')
  async remove(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<BaseResponse<any>> {
    await this.service.remove(req.user.id, id);
    return ResponseUtil.success({ deleted: true });
  }
}
