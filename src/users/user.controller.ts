import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/user.dto';
import { ResponseUtil } from '../shared/utils/response.util';
import {
  BaseResponse,
  UserProfileData,
  ErrorResponseData,
} from '../shared/types/base-response.types';

interface RequestWithUser extends Request {
  user: { id: string };
}

/**
 * Controller for handling user profile operations
 */
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get user profile (requires authentication)
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(
    @Req() req: RequestWithUser,
  ): Promise<BaseResponse<UserProfileData | ErrorResponseData>> {
    const userProfile = await this.userService.findById(req.user.id);

    if (!userProfile) {
      return ResponseUtil.notFound('User profile not found');
    }

    const profileData = this.userService.transformToProfileData(userProfile);
    return ResponseUtil.success(profileData);
  }

  /**
   * Update user profile (requires authentication)
   */
  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(
    @Req() req: RequestWithUser,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<BaseResponse<UserProfileData>> {
    const updatedUser = await this.userService.updateProfile(
      req.user.id,
      updateUserDto,
    );
    const profileData = this.userService.transformToProfileData(updatedUser);

    return ResponseUtil.success(profileData);
  }

  /**
   * Admin test endpoint for smoke testing
   */
  @Get('admin/test')
  adminTest(): BaseResponse<{ message: string; timestamp: Date }> {
    return ResponseUtil.success({
      message: 'Users module is working correctly',
      timestamp: new Date(),
    });
  }
}
