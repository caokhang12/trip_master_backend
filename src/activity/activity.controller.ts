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
import { ActivityService } from './activity.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { BulkCreateActivitiesDto } from './dto/bulk-create-activities.dto';
import { BulkUpdateActivitiesDto } from './dto/bulk-update-activities.dto';
import { BaseResponse } from 'src/shared/types/base-response.types';
import { ResponseUtil } from 'src/shared/utils/response.util';
import { AuthenticatedRequest } from 'src/auth/types/authenticated-request';

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivityController {
  constructor(private readonly service: ActivityService) {}

  @ApiOperation({ summary: 'Create activity in an itinerary the user owns' })
  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateActivityDto,
  ): Promise<BaseResponse<any>> {
    const created = await this.service.create(req.user.id, dto);
    return ResponseUtil.success(created);
  }

  @ApiOperation({ summary: 'List activities' })
  @ApiQuery({ name: 'itineraryId', required: false })
  @ApiQuery({ name: 'tripId', required: false })
  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('itineraryId') itineraryId?: string,
    @Query('tripId') tripId?: string,
  ): Promise<BaseResponse<any>> {
    const items = await this.service.listForUser(req.user.id, {
      itineraryId,
      tripId,
    });
    return ResponseUtil.success(items);
  }

  @ApiOperation({ summary: 'Bulk create activities' })
  @Post('bulk')
  async bulkCreate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: BulkCreateActivitiesDto,
  ): Promise<BaseResponse<any>> {
    const items = await this.service.bulkCreate(req.user.id, dto);
    return ResponseUtil.success(items);
  }

  @ApiOperation({ summary: 'Bulk update activities (reorder/move)' })
  @Put('bulk')
  async bulkUpdate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: BulkUpdateActivitiesDto,
  ): Promise<BaseResponse<any>> {
    const result = await this.service.bulkUpdate(req.user.id, dto);
    return ResponseUtil.success(result);
  }

  @ApiOperation({ summary: 'Update activity' })
  @Put(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
  ): Promise<BaseResponse<any>> {
    const updated = await this.service.update(req.user.id, id, dto);
    return ResponseUtil.success(updated);
  }

  @ApiOperation({ summary: 'Delete activity' })
  @Delete(':id')
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<BaseResponse<any>> {
    await this.service.remove(req.user.id, id);
    return ResponseUtil.success({ deleted: true });
  }
}
