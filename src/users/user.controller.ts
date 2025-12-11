import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
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
import { ListUsersResponseDto } from './dto/list-users-response.dto';
import { UserItemDto } from './dto/list-users-response.dto';
import { Paged } from '../shared/types/pagination';
import {
  FileUploadDto,
  UserProfileWithAvatarDto,
} from '../upload/dto/file-operations.dto';
import { FileValidationUtil } from '../upload/utils/file-validation.util';
import { AdminRoleGuard } from 'src/auth/guards/roles.guard';
import { AuthenticatedRequest } from 'src/auth/types/authenticated-request';

/**
 * User profile management with avatar upload integration
 */
@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Get authenticated user profile and preferences' })
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
  @Get('profile')
  async getProfile(
    @Req() req: AuthenticatedRequest,
  ): Promise<BaseResponse<UserProfileData | ErrorResponseData>> {
    const userProfile = await this.userService.findById(req.user.id);

    if (!userProfile) {
      return ResponseUtil.notFound('User profile not found');
    }

    const profileData = this.userService.transformToProfileData(userProfile);
    return ResponseUtil.success(profileData);
  }

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
  @Put('profile')
  async updateProfile(
    @Req() req: AuthenticatedRequest,
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
  @UseInterceptors(
    FileInterceptor('file', {
      limits: FileValidationUtil.getMulterLimits(),
      fileFilter: FileValidationUtil.getMulterFileFilter(),
    }),
  )
  @Post('avatar')
  async uploadAvatar(
    @Req() req: AuthenticatedRequest,
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
  @Delete('avatar')
  async removeAvatar(
    @Req() req: AuthenticatedRequest,
  ): Promise<BaseResponse<UserProfileData>> {
    const updatedProfile = await this.userService.removeUserAvatar(req.user.id);
    return ResponseUtil.success(updatedProfile);
  }

  /**
   * Get all users (admin only) with TypeORM pagination
   */
  @ApiOperation({
    summary: 'Get all users with pagination',
    description:
      'Admin-only endpoint to retrieve all users with TypeORM pagination',
  })
  @ApiBearerAuth()
  @ApiResponse({
    description: 'Users retrieved successfully with pagination',
    type: ListUsersResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin access required',
    type: ErrorResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid pagination parameters',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  @UseGuards(AdminRoleGuard)
  @Get()
  async getAllUsers(
    @Query() paginationDto: ListUsersDto,
  ): Promise<BaseResponse<Paged<UserItemDto>>> {
    const { page = 1, limit = 10, sortBy, sortOrder } = paginationDto;
    const paged = await this.userService.getAllUsers(
      page,
      limit,
      sortBy,
      sortOrder,
    );

    return ResponseUtil.success(paged);
  }
}
