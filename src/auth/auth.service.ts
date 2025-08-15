import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { UserService } from '../users/user.service';
import { UserEntity } from '../schemas/user.entity';
import { RefreshTokenEntity } from '../schemas/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { Response } from 'express';
import { ResponseUtil } from '../shared/utils/response.util';
import {
  BaseResponse,
  SecureAuthResponseData,
  UserProfileData,
} from '../shared/types/base-response.types';
import { UserRole } from '../shared/types/base-response.types';
import { ErrorResponseData } from '../shared/types/base-response.types';
import { EmailService } from '../email/email.service';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpires: Date;
  refreshTokenId: string;
}

@Injectable()
export class AuthService {
  private readonly refreshCookieName = 'refreshToken';

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshRepo: Repository<RefreshTokenEntity>,
  ) {}

  async register(dto: RegisterDto): Promise<UserProfileData> {
    const user = await this.userService.createUser({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const token = uuid().replace(/-/g, '') + uuid().replace(/-/g, '');
    await this.userService.setEmailVerificationToken(user.id, token);
    void this.emailService.sendVerificationEmail(
      user.email,
      token,
      user.firstName,
      'vi',
    );

    return this.userService.transformToProfileData(user);
  }

  async verifyEmail(
    dto: VerifyEmailDto,
  ): Promise<BaseResponse<{ verified: boolean } | ErrorResponseData>> {
    const user = await this.userService.verifyEmailAndGetUser(dto.token);
    if (!user) {
      return ResponseUtil.error('Invalid or expired verification token');
    }
    void this.emailService.sendWelcomeEmail(user.email, user.firstName, 'vi');
    return ResponseUtil.success<{ verified: boolean }>({ verified: true });
  }

  async resendVerification(
    dto: ResendVerificationDto,
  ): Promise<BaseResponse<{ requested: boolean } | ErrorResponseData>> {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      return ResponseUtil.success<{ requested: boolean }>({ requested: true });
    }
    if (user.emailVerified) {
      // Không tiết lộ trạng thái đã verify để tránh email enumeration
      return ResponseUtil.success<{ requested: boolean }>({ requested: true });
    }
    const token = uuid().replace(/-/g, '') + uuid().replace(/-/g, '');
    await this.userService.setEmailVerificationToken(user.id, token);
    await this.emailService.sendVerificationEmail(
      user.email,
      token,
      user.firstName,
      'vi',
    );
    return ResponseUtil.success<{ requested: boolean }>({ requested: true });
  }

  async login(
    dto: LoginDto,
    res: Response,
    deviceInfo?: RefreshTokenEntity['deviceInfo'],
  ): Promise<BaseResponse<SecureAuthResponseData>> {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.isLocked) {
      throw new ForbiddenException('Account locked');
    }
    if (!user.emailVerified) {
      throw new ForbiddenException('Email not verified');
    }
    const isValid = await this.userService.verifyPassword(user, dto.password);
    if (!isValid) {
      user.incrementFailedAttempts();
      await this.userService.saveUser(user);
      throw new UnauthorizedException('Invalid credentials');
    }
    user.resetFailedAttempts();
    user.lastLoginAt = new Date();
    await this.userService.saveUser(user);

    const tokenPair = await this.issueTokenPair(user, deviceInfo);
    this.setRefreshCookie(
      res,
      tokenPair.refreshToken,
      tokenPair.refreshTokenExpires,
    );

    const profile = this.userService.transformToProfileData(user);
    return ResponseUtil.success<SecureAuthResponseData>({
      access_token: tokenPair.accessToken,
      user_profile: profile,
    });
  }

  async refresh(
    req: {
      cookies?: Record<string, string>;
      user?: { id: string; role: UserRole; email: string };
    },
    res: Response,
  ): Promise<BaseResponse<SecureAuthResponseData>> {
    const refreshTokenValue = req.cookies?.[this.refreshCookieName];
    if (!refreshTokenValue) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const existing = await this.refreshRepo.findOne({
      where: { token: refreshTokenValue, isActive: true },
      relations: ['user'],
    });
    if (!existing || !existing.isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = existing.user;
    const rotate = true; // always rotate for security
    if (rotate) {
      existing.isActive = false;
      await this.refreshRepo.save(existing);
    }
    const tokenPair = await this.issueTokenPair(user, existing.deviceInfo);
    this.setRefreshCookie(
      res,
      tokenPair.refreshToken,
      tokenPair.refreshTokenExpires,
    );
    return ResponseUtil.success<SecureAuthResponseData>({
      access_token: tokenPair.accessToken,
      user_profile: this.userService.transformToProfileData(user),
    });
  }

  async logout(
    req: { cookies?: Record<string, string> },
    res: Response,
  ): Promise<BaseResponse<{ success: boolean }>> {
    const refreshTokenValue = req.cookies?.[this.refreshCookieName];
    if (refreshTokenValue) {
      await this.refreshRepo.update(
        { token: refreshTokenValue },
        { isActive: false, lastUsedAt: new Date() },
      );
    }
    res.clearCookie(this.refreshCookieName, { path: '/' });
    return ResponseUtil.success({ success: true });
  }

  private async issueTokenPair(
    user: UserEntity,
    deviceInfo?: RefreshTokenEntity['deviceInfo'],
  ): Promise<TokenPair> {
    const refreshTokenId = uuid();
    const refreshTokenValue =
      uuid().replace(/-/g, '') + uuid().replace(/-/g, '');
    const refreshExpires = new Date();
    refreshExpires.setDate(
      refreshExpires.getDate() +
        Number(this.configService.get('JWT_REFRESH_DAYS') || 7),
    );
    await this.refreshRepo.insert({
      id: refreshTokenId,
      token: refreshTokenValue,
      userId: user.id,
      expiresAt: refreshExpires,
      isActive: true,
      deviceInfo,
    });
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        rtj: refreshTokenId,
      },
      {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
      },
    );
    return {
      accessToken,
      refreshToken: refreshTokenValue,
      refreshTokenExpires: refreshExpires,
      refreshTokenId,
    };
  }

  private setRefreshCookie(res: Response, token: string, expires: Date) {
    res.cookie(this.refreshCookieName, token, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      expires,
      path: '/',
    });
  }
}
