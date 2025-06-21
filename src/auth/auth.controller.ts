import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpCode,
  UseGuards,
  Get,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
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
import {
  BaseResponse,
  AuthResponseData,
} from '../shared/types/base-response.types';
import {
  AuthSuccessResponseDto,
  ErrorResponseDto,
  VerificationSuccessResponseDto,
} from '../shared/dto/response.dto';
import { AuthControllerUtil } from './utils/auth-controller.util';
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
  ): Promise<BaseResponse<AuthResponseData>> {
    const result = await this.authService.register(registerDto);
    return AuthControllerUtil.createAuthResponse(result, HttpStatus.CREATED);
  }

  @ApiOperation({ summary: 'Authenticate user with email and password' })
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
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<BaseResponse<AuthResponseData>> {
    const result = await this.authService.login(loginDto);
    return AuthControllerUtil.createAuthResponse(result);
  }

  @ApiOperation({ summary: 'Refresh access token using refresh token' })
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
    return AuthControllerUtil.createAuthResponse(result);
  }

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

  @Post('resend-verification')
  async resendVerification(
    @Body() resendDto: ResendVerificationDto,
  ): Promise<BaseResponse<{ sent: boolean }>> {
    const result = await this.authService.resendVerification(resendDto);
    return AuthControllerUtil.createAuthResponse({ sent: result });
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<BaseResponse<{ sent: boolean }>> {
    const result = await this.authService.forgotPassword(forgotPasswordDto);
    return AuthControllerUtil.createAuthResponse({ sent: result });
  }

  @Post('reset-password')
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<BaseResponse<{ reset: boolean }>> {
    const result = await this.authService.resetPassword(resetPasswordDto);
    return AuthControllerUtil.createAuthResponse({ reset: result });
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: AuthRequest,
  ): Promise<BaseResponse<{ logout: boolean }>> {
    const result = await this.authService.logout(req.user.id);
    return AuthControllerUtil.createAuthResponse({ logout: result });
  }

  /**
   * Admin test endpoint for smoke testing
   */
  @Get('admin/test')
  adminTest(): BaseResponse<{ message: string; timestamp: Date }> {
    return AuthControllerUtil.createAdminTestResponse('Auth');
  }
}
