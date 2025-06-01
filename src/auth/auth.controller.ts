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

interface RequestWithUser extends Request {
  user: { id: string };
}

/**
 * Controller for handling authentication operations
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   */
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
  @Get('admin/test')
  adminTest(): BaseResponse<{ message: string; timestamp: Date }> {
    return ResponseUtil.success({
      message: 'Auth module is working correctly',
      timestamp: new Date(),
    });
  }
}
