import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UserService } from '../../users/user.service';
import { RefreshTokenService } from '../services/refresh-token.service';
import { AuthConfig } from '../config/auth.config';

interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

interface RequestWithCookies extends Omit<Request, 'cookies'> {
  cookies?: Record<string, string>;
}

/**
 * JWT access token strategy with user validation for protected routes
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<AuthConfig['jwt']>('auth.jwt')?.accessSecret ||
        'fallback-secret',
    });
  }

  async validate(
    payload: JwtPayload,
  ): Promise<{ id: string; email: string; role: string }> {
    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}

/**
 * JWT refresh token strategy with additional security validation
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: RequestWithCookies) => {
          // Extract refresh token from httpOnly cookie
          return request?.cookies?.refreshToken as string;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<AuthConfig['jwt']>('auth.jwt')?.refreshSecret ||
        'fallback-refresh-secret',
      passReqToCallback: true,
    });
  }

  async validate(
    req: RequestWithCookies,
    payload: JwtPayload,
  ): Promise<{ id: string; email: string; role: string }> {
    const refreshToken = req.cookies?.refreshToken as string;
    const user = await this.userService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Validate refresh token exists and is active
    const tokenEntity =
      await this.refreshTokenService.findValidToken(refreshToken);
    if (!tokenEntity || tokenEntity.userId !== user.id) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
