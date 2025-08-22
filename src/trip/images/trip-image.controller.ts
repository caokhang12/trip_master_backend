import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TripImageService } from './trip-image.service';
import { SignTripImagesRequestDto } from './dto/sign-upload.dto';
import {
  ConfirmTripImagesDto,
  DiffTripImagesDto,
  ReorderTripImagesDto,
  SetThumbnailDto,
} from './dto/confirm-images.dto';
import { ResponseUtil } from '../../shared/utils/response.util';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: { id: string };
}

@ApiTags('Trip Images')
@ApiBearerAuth()
@Controller('trips/:tripId/images')
export class TripImageController {
  constructor(private readonly svc: TripImageService) {}

  @Post('sign')
  @ApiOperation({ summary: 'Xin chữ ký upload trực tiếp Cloudinary' })
  async sign(
    @Req() req: RequestWithUser,
    @Param('tripId') tripId: string,
    @Body() dto: SignTripImagesRequestDto,
  ) {
    const data = await this.svc.sign(req.user.id, tripId, dto);
    return ResponseUtil.success(data);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Xác nhận và lưu các ảnh đã upload' })
  async confirm(
    @Req() req: RequestWithUser,
    @Param('tripId') tripId: string,
    @Body() dto: ConfirmTripImagesDto,
  ) {
    const gallery = await this.svc.confirm(req.user.id, tripId, dto);
    return ResponseUtil.success(gallery);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Sắp xếp lại thứ tự ảnh' })
  async reorder(
    @Req() req: RequestWithUser,
    @Param('tripId') tripId: string,
    @Body() dto: ReorderTripImagesDto,
  ) {
    const gallery = await this.svc.reorder(req.user.id, tripId, dto);
    return ResponseUtil.success(gallery);
  }

  @Patch('thumbnail')
  @ApiOperation({ summary: 'Đặt thumbnail cho trip' })
  async setThumbnail(
    @Req() req: RequestWithUser,
    @Param('tripId') tripId: string,
    @Body() dto: SetThumbnailDto,
  ) {
    const gallery = await this.svc.setThumbnail(req.user.id, tripId, dto);
    return ResponseUtil.success(gallery);
  }

  @Post('diff')
  @ApiOperation({ summary: 'Đồng bộ danh sách ảnh (xóa phần dư)' })
  async diff(
    @Req() req: RequestWithUser,
    @Param('tripId') tripId: string,
    @Body() dto: DiffTripImagesDto,
  ) {
    const gallery = await this.svc.diff(req.user.id, tripId, dto);
    return ResponseUtil.success(gallery);
  }

  @Delete(':publicId')
  @ApiOperation({ summary: 'Xóa 1 ảnh đơn lẻ' })
  async deleteSingle(
    @Req() req: RequestWithUser,
    @Param('tripId') tripId: string,
    @Param('publicId') publicId: string,
  ) {
    const decoded = decodeURIComponent(publicId);
    const gallery = await this.svc.deleteSingle(req.user.id, tripId, decoded);
    return ResponseUtil.success(gallery);
  }

  @Get('gallery')
  @ApiOperation({ summary: 'Lấy gallery hiện tại' })
  async gallery(@Req() req: RequestWithUser, @Param('tripId') tripId: string) {
    const gallery = await this.svc.buildGallery(tripId);
    return ResponseUtil.success(gallery);
  }
}
