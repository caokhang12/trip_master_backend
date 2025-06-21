import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../users/user.service';

interface JwtPayload {
  sub: string;
  email: string;
}

interface RefreshTokenRequest {
  body: {
    refreshToken: string;
  };
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
      secretOrKey: configService.get('JWT_ACCESS_SECRET') || 'fallback-secret',
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
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey:
        configService.get('JWT_REFRESH_SECRET') || 'fallback-refresh-secret',
      passReqToCallback: true,
    });
  }

  async validate(
    req: RefreshTokenRequest,
    payload: JwtPayload,
  ): Promise<{ id: string; email: string; role: string }> {
    const refreshToken = req.body.refreshToken;
    const user = await this.userService.findById(payload.sub);

    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
