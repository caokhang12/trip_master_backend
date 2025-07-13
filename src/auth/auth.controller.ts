import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  UseGuards,
  Req,
  Res,
  Get,
  Delete,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiBearerAuth,
  ApiParam,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
// import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SocialLoginDto,
} from './dto/auth.dto';
import { SessionDto } from './dto/session.dto';
import {
  BaseResponse,
  SecureAuthResponseData,
  SessionData,
} from '../shared/types/base-response.types';
import {
  AuthSuccessResponseDto,
  ErrorResponseDto,
  VerificationSuccessResponseDto,
} from '../shared/dto/response.dto';
import { AuthControllerUtil } from './utils/auth-controller.util';
import { DeviceInfoUtil } from './utils/device-info.util';
import { AuthRequest } from '../shared/interfaces/auth.interface';

/**
 * Authentication controller with JWT-based user management
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register new user account' })
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
  ): Promise<BaseResponse<SecureAuthResponseData>> {
    const result = await this.authService.register(registerDto);
    return AuthControllerUtil.createAuthResponse(result, HttpStatus.CREATED);
  }

  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description:
      'User successfully authenticated. Refresh token set in HTTP-only cookie.',
    type: AuthSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials, unverified email, or account locked',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<BaseResponse<SecureAuthResponseData>> {
    const deviceInfo = DeviceInfoUtil.extractFromRequest(request);
    const result = await this.authService.login(loginDto, deviceInfo);

    // Set refresh token in HTTP-only cookie
    response.cookie('refreshToken', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/auth/refresh', // Only send cookie to refresh endpoint
    });

    // Return response without refresh_token
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refresh_token, ...responseData } = result;
    return AuthControllerUtil.createAuthResponse(responseData);
  }

  @ApiOperation({
    summary: 'Refresh access token using refresh token from HTTP-only cookie',
  })
  @ApiCookieAuth('refreshToken')
  @ApiResponse({
    status: 200,
    description:
      'New access token generated successfully. New refresh token set in HTTP-only cookie.',
    type: AuthSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute
  @Post('refresh')
  async refreshToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<BaseResponse<SecureAuthResponseData>> {
    const refreshToken = request.cookies?.refreshToken as string;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const deviceInfo = DeviceInfoUtil.extractFromRequest(request);
    const result = await this.authService.refreshToken(
      refreshToken,
      deviceInfo,
    );

    // Update refresh token cookie
    response.cookie('refreshToken', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refresh_token, ...responseData } = result;
    return AuthControllerUtil.createAuthResponse(responseData);
  }

  @ApiOperation({
    summary: 'Social media authentication',
    description:
      'Authenticate user using social media provider (Google, Facebook, Apple). Currently not implemented - returns 501 Not Implemented.',
  })
  @ApiBody({ type: SocialLoginDto })
  @ApiResponse({
    status: 501,
    description: 'Social login not yet implemented',
    type: ErrorResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  @Post('social-login')
  async socialLogin(
    @Body() socialLoginDto: SocialLoginDto,
  ): Promise<BaseResponse<SecureAuthResponseData>> {
    const result = await this.authService.socialLogin(socialLoginDto);
    return AuthControllerUtil.createAuthResponse(result);
  }

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
    return AuthControllerUtil.createAuthResponse({ verified: result });
  }

  @ApiOperation({
    summary: 'Resend email verification',
    description: 'Resend verification email to user if not yet verified',
  })
  @ApiBody({ type: ResendVerificationDto })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    type: VerificationSuccessResponseDto,
  })
  @ApiBadRequestResponse({
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
    return AuthControllerUtil.createAuthResponse({ sent: result });
  }

  @ApiOperation({
    summary: 'Request password reset',
    description: 'Send password reset email to user',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description:
      'Password reset email sent (always returns success to prevent email enumeration)',
    type: VerificationSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
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
    return AuthControllerUtil.createAuthResponse({ sent: result });
  }

  @ApiOperation({
    summary: 'Reset password with token',
    description: 'Reset user password using token from email',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password successfully reset',
    type: VerificationSuccessResponseDto,
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
    return AuthControllerUtil.createAuthResponse({ reset: result });
  }

  @ApiOperation({
    summary: 'Logout user',
    description: 'Logout user by invalidating refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out',
    type: VerificationSuccessResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing JWT token',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponseDto,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<BaseResponse<{ logout: boolean }>> {
    const refreshToken = req.cookies?.refreshToken as string;
    const result = await this.authService.logout(req.user.id, refreshToken);

    // Clear refresh token cookie
    response.clearCookie('refreshToken', {
      path: '/auth/refresh',
    });

    return AuthControllerUtil.createAuthResponse({ logout: result });
  }

  @ApiOperation({ summary: 'Logout user from all devices' })
  @ApiResponse({
    status: 200,
    description: 'User logged out from all devices successfully',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<BaseResponse<{ logout: boolean }>> {
    const result = await this.authService.logoutAll(req.user.id);

    // Clear refresh token cookie
    response.clearCookie('refreshToken', {
      path: '/auth/refresh',
    });

    return AuthControllerUtil.createAuthResponse({ logout: result });
  }

  @ApiOperation({ summary: 'Get active sessions for current user' })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved successfully',
    type: [SessionDto],
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getActiveSessions(
    @Req() req: AuthRequest,
  ): Promise<BaseResponse<SessionData[]>> {
    const refreshToken = req.cookies?.refreshToken as string;
    const sessions = await this.authService.getActiveSessions(
      req.user.id,
      refreshToken,
    );
    return AuthControllerUtil.createAuthResponse(sessions);
  }

  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID to revoke' })
  @ApiResponse({
    status: 200,
    description: 'Session revoked successfully',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId')
  async revokeSession(
    @Req() req: AuthRequest,
    @Param('sessionId') sessionId: string,
  ): Promise<BaseResponse<{ success: boolean }>> {
    const success = await this.authService.revokeSession(
      req.user.id,
      sessionId,
    );
    return AuthControllerUtil.createAuthResponse({ success });
  }
}
