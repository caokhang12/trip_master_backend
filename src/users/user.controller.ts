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
import {
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import {
  FileUploadDto,
  UserProfileWithAvatarDto,
} from '../shared/dto/file-operations.dto';

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

  /**
   * Upload user avatar
   */
  @ApiOperation({
    summary: 'Upload user avatar',
    description: 'Upload and set user profile avatar image',
  })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: FileUploadDto })
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
    type: UserProfileWithAvatarDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid file or file too large',
    type: ErrorResponseDto,
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/^image\/(jpeg|jpg|png|webp)$/)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only images allowed'), false);
        }
      },
    }),
  )
  @Post('avatar')
  async uploadAvatar(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<BaseResponse<UserProfileData>> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const updatedProfile = await this.userService.updateUserAvatar(
      req.user.id,
      file,
    );

    return ResponseUtil.success(updatedProfile);
  }

  /**
   * Remove user avatar
   */
  @ApiOperation({
    summary: 'Remove user avatar',
    description: 'Remove current user profile avatar',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Avatar removed successfully',
    type: UserProfileWithAvatarDto,
  })
  @UseGuards(JwtAuthGuard)
  @Delete('avatar')
  async removeAvatar(
    @Req() req: RequestWithUser,
  ): Promise<BaseResponse<UserProfileData>> {
    const updatedProfile = await this.userService.removeUserAvatar(req.user.id);
    return ResponseUtil.success(updatedProfile);
  }

  /**
   * Get enhanced user profile with avatar info
   */
  @ApiOperation({
    summary: 'Get enhanced user profile',
    description: 'Get user profile with avatar and image information',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Enhanced profile retrieved successfully',
    type: UserProfileWithAvatarDto,
  })
  @UseGuards(JwtAuthGuard)
  @Get('profile/enhanced')
  async getEnhancedProfile(
    @Req() req: RequestWithUser,
  ): Promise<BaseResponse<UserProfileData>> {
    const profile = await this.userService.getUserProfile(req.user.id);
    return ResponseUtil.success(profile);
  }
}
