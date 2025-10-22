import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ResponseUtil } from '../shared/utils/response.util';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import {
  BaseResponse,
  SecureAuthResponseData,
} from '../shared/types/base-response.types';
import { VerificationSuccessResponseDto } from '../shared/dto/response.dto';
import { LogoutSuccessResponseDto } from '../shared/dto/response.dto';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../schemas/user.entity';

export interface RequestWithUser extends Request {
  user: { id: string };
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Register new user' })
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const profile = await this.authService.register(dto);
    return ResponseUtil.success(profile);
  }

  @ApiOperation({ summary: 'Verify account email by token' })
  @ApiResponse({
    status: 200,
    description: 'Email verified',
    type: VerificationSuccessResponseDto,
  })
  @Public()
  @Get('verify-email')
  async verifyEmail(@Query() dto: VerifyEmailDto) {
    return await this.authService.verifyEmail(dto);
  }

  @ApiOperation({ summary: 'Resend verification email' })
  @Public()
  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return await this.authService.resendVerification(dto);
  }

  @ApiOperation({
    summary: 'Login and receive access token + HttpOnly refresh cookie',
  })
  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<BaseResponse<SecureAuthResponseData>> {
    return this.authService.login(dto, res);
  }

  @ApiOperation({
    summary: 'Refresh access token using HttpOnly refresh cookie',
  })
  @Public()
  //@UseGuards(CsrfGuard)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<BaseResponse<SecureAuthResponseData>> {
    return this.authService.refresh(
      req as unknown as { cookies?: Record<string, string> },
      res,
    );
  }

  @ApiOperation({
    summary: 'Logout (invalidate refresh token and clear cookie)',
  })
  @ApiResponse({
    status: 200,
    description: 'Logged out',
    type: LogoutSuccessResponseDto,
  })
  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(
      req as unknown as { cookies?: Record<string, string> },
      res,
    );
  }

  @ApiOperation({
    summary: 'Get current authenticated user (requires access token)',
  })
  @ApiBearerAuth()
  @Get('me')
  me(@Req() req: RequestWithUser) {
    if (!req.user) return ResponseUtil.unauthorized();
    return ResponseUtil.success({ id: req.user.id });
  }

  // Google OAuth Login
  @ApiOperation({ summary: 'Google OAuth Login' })
  @UseGuards(AuthGuard('google'))
  @Get('google')
  async googleAuth() {
    // Initiates the Google OAuth2 login flow
  }

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request & { user?: UserEntity },
    @Res() res: Response,
  ) {
    const user = req.user as UserEntity | undefined;
    if (!user) {
      return res
        .status(401)
        .send('Authentication failed: No user information received.');
    }
    await this.authService.createSessionForUser(user, res);
    return res.redirect(
      this.configService.getOrThrow<string>('FRONTEND_URL') ||
        'http://localhost:5173',
    );
  }
}
