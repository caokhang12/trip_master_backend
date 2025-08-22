import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { TripService } from './trip.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { BaseResponse } from '../shared/types/base-response.types';
import { ResponseUtil } from '../shared/utils/response.util';
import { Request } from 'express';
import { TripMapper } from './dto/trip-response.dto';
import { AdminRoleGuard } from 'src/auth/roles.guard';
import { TripListQueryDto } from './dto/trip-list-query.dto';

interface RequestWithUser extends Request {
  user: { id: string };
}

@ApiTags('Trips')
@ApiBearerAuth()
@Controller('trips')
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @ApiOperation({ summary: 'Create a new trip (current user)' })
  @ApiResponse({ status: 201, description: 'Trip created successfully' })
  @Post()
  async create(
    @Req() req: RequestWithUser,
    @Body() dto: CreateTripDto,
  ): Promise<BaseResponse<any>> {
    const created = await this.tripService.create(req.user.id, dto);
    return ResponseUtil.success(TripMapper.toUserDto(created));
  }

  @ApiOperation({ summary: 'List current user trips' })
  @ApiResponse({ status: 200, description: 'Trips retrieved successfully' })
  @Get()
  async list(
    @Req() req: RequestWithUser,
    @Query() query: TripListQueryDto,
  ): Promise<BaseResponse<any>> {
    const result = await this.tripService.listForUser(
      req.user.id,
      query.page ?? 1,
      query.limit ?? 10,
      query.search,
      query.status,
      query.startDateFrom,
      query.startDateTo,
      query.endDateFrom,
      query.endDateTo,
      query.sortBy,
      query.sortOrder ?? 'DESC',
    );
    return ResponseUtil.success(TripMapper.toUserList(result));
  }

  @ApiOperation({ summary: 'Get trip by id (current user owns)' })
  @ApiNotFoundResponse({ description: 'Trip not found' })
  @Get(':id')
  async getOne(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<BaseResponse<any>> {
    const trip = await this.tripService.findOneForUser(id, req.user.id);
    return ResponseUtil.success(TripMapper.toUserDto(trip));
  }

  @ApiOperation({ summary: 'Update trip (current user owns)' })
  @ApiResponse({ status: 200, description: 'Trip updated successfully' })
  @Put(':id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ): Promise<BaseResponse<any>> {
    const updated = await this.tripService.updateForUser(id, req.user.id, dto);
    return ResponseUtil.success(TripMapper.toUserDto(updated));
  }

  @ApiOperation({ summary: 'Delete trip (current user owns)' })
  @ApiResponse({ status: 200, description: 'Trip deleted successfully' })
  @Delete(':id')
  async remove(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<BaseResponse<any>> {
    await this.tripService.removeForUser(id, req.user.id);
    return ResponseUtil.success({ deleted: true });
  }

  // Admin endpoints
  @ApiOperation({ summary: 'Admin: List all trips' })
  @ApiForbiddenResponse({ description: 'Admin access required' })
  @UseGuards(AdminRoleGuard)
  @Get('admin/all')
  async adminList(
    @Query() query: TripListQueryDto,
  ): Promise<BaseResponse<any>> {
    const result = await this.tripService.listAll(
      query.page ?? 1,
      query.limit ?? 10,
      query.search,
      query.status,
      query.startDateFrom,
      query.startDateTo,
      query.endDateFrom,
      query.endDateTo,
      query.sortBy,
      query.sortOrder ?? 'DESC',
    );
    return ResponseUtil.success(TripMapper.toAdminList(result));
  }

  @ApiOperation({ summary: 'Admin: Get trip by id' })
  @UseGuards(AdminRoleGuard)
  @Get('admin/:id')
  async adminGetOne(@Param('id') id: string): Promise<BaseResponse<any>> {
    const trip = await this.tripService.findOneAdmin(id);
    return ResponseUtil.success(TripMapper.toAdminDto(trip));
  }

  @ApiOperation({ summary: 'Admin: Update trip' })
  @UseGuards(AdminRoleGuard)
  @Put('admin/:id')
  async adminUpdate(
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ): Promise<BaseResponse<any>> {
    const updated = await this.tripService.updateAdmin(id, dto);
    return ResponseUtil.success(TripMapper.toAdminDto(updated));
  }

  @ApiOperation({ summary: 'Admin: Delete trip' })
  @UseGuards(AdminRoleGuard)
  @Delete('admin/:id')
  async adminRemove(@Param('id') id: string): Promise<BaseResponse<any>> {
    await this.tripService.removeAdmin(id);
    return ResponseUtil.success({ deleted: true });
  }
}
