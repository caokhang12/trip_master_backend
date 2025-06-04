import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/user.dto';
import { ResponseUtil } from '../shared/utils/response.util';
import {
  BaseResponse,
  UserProfileData,
  ErrorResponseData,
} from '../shared/types/base-response.types';
import {
  UserProfileSuccessResponseDto,
  ErrorResponseDto,
  AdminTestResponseDto,
} from '../shared/dto/response.dto';

interface RequestWithUser extends Request {
  user: { id: string };
}

/**
 * Controller for handling user profile operations
 */
@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get user profile (requires authentication)
   */
  @ApiOperation({
    summary: 'Get user profile',
    description:
      'Retrieve authenticated user profile information including preferences',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserProfileSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User profile not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
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
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Update authenticated user profile information and travel preferences',
  })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    type: UserProfileSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
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
  @ApiOperation({
    summary: 'Users module health check',
    description: 'Test endpoint to verify users module is working correctly',
  })
  @ApiResponse({
    status: 200,
    description: 'Users module is working correctly',
    type: AdminTestResponseDto,
  })
  @Get('admin/test')
  adminTest(): BaseResponse<{ message: string; timestamp: Date }> {
    return ResponseUtil.success({
      message: 'Users module is working correctly',
      timestamp: new Date(),
    });
  }
}
