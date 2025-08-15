import { Controller, Post, Body, Res, Req, Get } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ResponseUtil } from '../shared/utils/response.util';
import {
  BaseResponse,
  SecureAuthResponseData,
} from '../shared/types/base-response.types';

export interface RequestWithUser extends Request {
  user: { id: string };
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register new user' })
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const profile = await this.authService.register(dto);
    return ResponseUtil.success(profile);
  }

  @ApiOperation({
    summary: 'Login and receive access token + HttpOnly refresh cookie',
  })
  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ): Promise<BaseResponse<SecureAuthResponseData>> {
    return this.authService.login(dto, res, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      deviceType: 'web',
    });
  }

  @ApiOperation({
    summary: 'Refresh access token using HttpOnly refresh cookie',
  })
  @Public()
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
}
