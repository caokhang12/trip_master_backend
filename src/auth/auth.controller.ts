import {
  Controller,
  Post,
  Body,
  HttpStatus,
  UseGuards,
  Get,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SocialLoginDto,
} from './dto/auth.dto';
import { ResponseUtil } from '../shared/utils/response.util';
import {
  BaseResponse,
  AuthResponseData,
} from '../shared/types/base-response.types';
import {
  AuthSuccessResponseDto,
  ErrorResponseDto,
  VerificationSuccessResponseDto,
  EmailSentSuccessResponseDto,
  PasswordResetSuccessResponseDto,
  LogoutSuccessResponseDto,
  AdminTestResponseDto,
} from '../shared/dto/response.dto';

interface RequestWithUser extends Request {
  user: { id: string };
}

/**
 * Controller for handling authentication operations
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   */
  @ApiOperation({
    summary: 'Register a new user account',
    description:
      'Create a new user account with email and password. Email verification will be sent.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered. Email verification sent.',
    type: AuthSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email already exists',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<BaseResponse<AuthResponseData>> {
    const result = await this.authService.register(registerDto);
    return ResponseUtil.success(result, HttpStatus.CREATED);
  }

  /**
   * Login user with email and password
   */
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user with email and password. Returns JWT tokens on success.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated',
    type: AuthSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or unverified email',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<BaseResponse<AuthResponseData>> {
    const result = await this.authService.login(loginDto);
    return ResponseUtil.success(result);
  }

  /**
   * Refresh access token using refresh token
   */
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generate new access token using valid refresh token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'New access token generated successfully',
    type: AuthSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  @Post('refresh')
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<BaseResponse<AuthResponseData>> {
    const result = await this.authService.refreshToken(refreshTokenDto);
    return ResponseUtil.success(result);
  }

  /**
   * Social login with provider
   */
  @ApiOperation({
    summary: 'Social media login',
    description:
      'Authenticate user using social media provider (Google, Facebook, Apple)',
  })
  @ApiBody({ type: SocialLoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated via social provider',
    type: AuthSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid social provider token',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  @Post('social-login')
  async socialLogin(
    @Body() socialLoginDto: SocialLoginDto,
  ): Promise<BaseResponse<AuthResponseData>> {
    const result = await this.authService.socialLogin(socialLoginDto);
    return ResponseUtil.success(result);
  }

  /**
   * Verify email with verification token
   */
  @ApiOperation({
    summary: 'Verify email address',
    description: 'Verify user email address using token sent via email',
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Email successfully verified',
    type: VerificationSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired verification token',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  @Post('verify-email')
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<BaseResponse<{ verified: boolean }>> {
    const result = await this.authService.verifyEmail(verifyEmailDto);
    return ResponseUtil.success({ verified: result });
  }

  /**
   * Resend email verification
   */
  @ApiOperation({
    summary: 'Resend email verification',
    description: 'Resend email verification link to user email address',
  })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    type: EmailSentSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found or email already verified',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  @Post('resend-verification')
  async resendVerification(
    @Body() resendDto: ResendVerificationDto,
  ): Promise<BaseResponse<{ sent: boolean }>> {
    const result = await this.authService.resendVerification(resendDto);
    return ResponseUtil.success({ sent: result });
  }

  /**
   * Send forgot password email
   */
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Send password reset instructions to user email address',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent successfully',
    type: EmailSentSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  @Post('forgot-password')
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<BaseResponse<{ sent: boolean }>> {
    const result = await this.authService.forgotPassword(forgotPasswordDto);
    return ResponseUtil.success({ sent: result });
  }

  /**
   * Reset password with reset token
   */
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset user password using token received via email',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: PasswordResetSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired reset token',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  @Post('reset-password')
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<BaseResponse<{ reset: boolean }>> {
    const result = await this.authService.resetPassword(resetPasswordDto);
    return ResponseUtil.success({ reset: result });
  }

  /**
   * Logout user (requires authentication)
   */
  @ApiOperation({
    summary: 'User logout',
    description:
      'Invalidate user session and refresh token (requires authentication)',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'User logged out successfully',
    type: LogoutSuccessResponseDto,
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
  @Post('logout')
  async logout(
    @Req() req: RequestWithUser,
  ): Promise<BaseResponse<{ logout: boolean }>> {
    const result = await this.authService.logout(req.user.id);
    return ResponseUtil.success({ logout: result });
  }

  /**
   * Admin test endpoint for smoke testing
   */
  @ApiOperation({
    summary: 'Authentication module health check',
    description:
      'Test endpoint to verify authentication module is working correctly',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication module is working correctly',
    type: AdminTestResponseDto,
  })
  @Get('admin/test')
  adminTest(): BaseResponse<{ message: string; timestamp: Date }> {
    return ResponseUtil.success({
      message: 'Auth module is working correctly',
      timestamp: new Date(),
    });
  }
}
