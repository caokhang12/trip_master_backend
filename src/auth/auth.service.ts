import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
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
import { Profile } from 'passport-google-oauth20';
import * as crypto from 'crypto';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpires: Date;
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
    let user: UserEntity;
    try {
      user = await this.userService.createUser({
        email: dto.email,
        password: dto.password,
        firstName: dto.firstName,
        lastName: dto.lastName,
      });
    } catch (err) {
      if (err instanceof ConflictException) {
        // Email đã tồn tại
        throw new ConflictException('Email đã được sử dụng');
      }
      throw err;
    }

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

  async googleLogin(email: string, oauthId: string, profile: Profile) {
    const existing = await this.userService.findByEmail(email);
    if (existing) {
      // nếu đã linked
      if (existing.oauthId === oauthId) return existing;
      // nếu chưa linked, link vào account hiện có
      existing.oauthId = oauthId;
      existing.provider = profile.provider;
      await this.userService.saveUser(existing);
      return existing;
    }
    // tạo user mới (giữ password random/empty)
    const user = await this.userService.createUser({
      email,
      password: uuid().replace(/-/g, ''),
      firstName: profile._json.given_name,
      lastName: profile._json.family_name,
      provider: profile.provider,
      oauthId,
      profile,
    });
    return user;
  }

  async verifyEmail(
    dto: VerifyEmailDto,
  ): Promise<BaseResponse<{ verified: boolean } | ErrorResponseData>> {
    const user = await this.userService.verifyEmailAndGetUser(dto.token);
    if (!user) {
      return ResponseUtil.error('Token xác thực không hợp lệ hoặc đã hết hạn');
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
  ): Promise<BaseResponse<SecureAuthResponseData>> {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      // Email không tồn tại
      throw new UnauthorizedException('Email không tồn tại');
    }
    if (user.isLocked) {
      throw new ForbiddenException('Tài khoản đã bị khóa');
    }
    if (!user.emailVerified) {
      throw new ForbiddenException('Email chưa được xác thực');
    }
    const isValid = await this.userService.verifyPassword(user, dto.password);
    if (!isValid) {
      user.incrementFailedAttempts();
      await this.userService.saveUser(user);
      // Mật khẩu sai
      throw new UnauthorizedException('Mật khẩu không đúng');
    }
    user.resetFailedAttempts();
    user.lastLoginAt = new Date();
    await this.userService.saveUser(user);

    const tokenPair = await this.issueTokenPair(user);
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
      throw new UnauthorizedException('Thiếu refresh token');
    }
    const hashed = crypto
      .createHash('sha256')
      .update(refreshTokenValue)
      .digest('hex');
    const existing = await this.refreshRepo.findOne({
      where: { token: hashed, isRevoked: false },
      relations: ['user'],
    });
    if (!existing || !existing.isValid) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
    const user = existing.user;
    const rotate = true; // always rotate for security
    if (rotate) {
      // Revoke the previous refresh token when rotating
      existing.isRevoked = true;
      existing.lastUsedAt = new Date();
      await this.refreshRepo.save(existing);
    }
    const tokenPair = await this.issueTokenPair(user);
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
  ): Promise<BaseResponse<{ logout: boolean }>> {
    const refreshTokenValue = req.cookies?.[this.refreshCookieName];
    if (refreshTokenValue) {
      const hashed = crypto
        .createHash('sha256')
        .update(refreshTokenValue)
        .digest('hex');
      await this.refreshRepo.update(
        { token: hashed },
        { isRevoked: true, lastUsedAt: new Date() },
      );
    }
    this.clearRefreshCookie(res);
    return ResponseUtil.success({ logout: true });
  }

  async createSessionForUser(
    user: UserEntity,
    res: Response,
  ): Promise<SecureAuthResponseData> {
    const tokenPair = await this.issueTokenPair(user);
    this.setRefreshCookie(
      res,
      tokenPair.refreshToken,
      tokenPair.refreshTokenExpires,
    );
    return {
      access_token: tokenPair.accessToken,
      user_profile: this.userService.transformToProfileData(user),
    };
  }

  protected async issueTokenPair(user: UserEntity): Promise<TokenPair> {
    const refreshTokenValue =
      uuid().replace(/-/g, '') + uuid().replace(/-/g, '');
    const hashed = crypto
      .createHash('sha256')
      .update(refreshTokenValue)
      .digest('hex');
    const days = Math.max(
      Number(this.configService.get('JWT_REFRESH_DAYS')) || 0,
      1,
    );
    const refreshExpires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.refreshRepo.insert({
      token: hashed,
      userId: user.id,
      expiresAt: refreshExpires,
      isRevoked: false,
    });
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
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
    };
  }

  private setRefreshCookie(res: Response, token: string, expires: Date) {
    res.cookie(this.refreshCookieName, token, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      expires,
      path: '/auth/refresh',
      domain: this.getCookieDomain(),
    });
  }

  private clearRefreshCookie(res: Response) {
    const baseOptions = {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: '/auth/refresh',
    };
    const domain = this.getCookieDomain();
    // Clear domain-scoped cookie (new)
    if (domain) {
      res.clearCookie(this.refreshCookieName, { ...baseOptions, domain });
    }
    // Also clear legacy host-only cookie (old)
    res.clearCookie(this.refreshCookieName, baseOptions);
  }

  private getCookieDomain(): string | undefined {
    const domain = this.configService.get<string>('COOKIE_DOMAIN');
    return domain || undefined;
  }
}
