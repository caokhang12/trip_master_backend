import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshTokenEntity } from '../../schemas/refresh-token.entity';
import { v4 as uuid } from 'uuid';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../public.decorator';

/**
 * JwtAuthGuard with rolling refresh token support.
 * - Validates access token (short-lived)
 * - If access token is within REFRESH_THRESHOLD seconds of expiring and a valid refresh token cookie exists,
 *   issues a new access token (and optionally rotates refresh token if near expiry or flagged) and sets cookie.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly refreshCookieName = 'refreshToken';
  private readonly refreshThresholdSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshRepo: Repository<RefreshTokenEntity>,
  ) {
    super();
    this.refreshThresholdSeconds = Number(
      configService.get('JWT_ACCESS_REFRESH_THRESHOLD_SECONDS') || 60,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const can = (await super.canActivate(context)) as boolean;
    if (can) await this.handleRollingRefresh(context);
    return can;
  }

  private async handleRollingRefresh(context: ExecutionContext): Promise<void> {
    const request = context
      .switchToHttp()
      .getRequest<
        Request & { user?: { id: string; email: string; role: string } }
      >();
    const response = context.switchToHttp().getResponse<Response>();
    if (!request.user) return;
    const authHeader = request.headers.authorization;
    if (!authHeader) return;
    const token = authHeader.split(' ')[1];
    if (!token) return;

    let decoded: Record<string, any> | null;
    try {
      decoded = this.jwtService.decode(token);
    } catch {
      return; // ignore decode errors; auth already validated by strategy
    }
    if (!decoded || typeof decoded !== 'object') return;
    const exp = decoded['exp'] as number | undefined;
    if (!exp) return;
    const nowSec = Math.floor(Date.now() / 1000);
    const timeLeft = exp - nowSec;
    if (timeLeft > this.refreshThresholdSeconds) return; // not near expiry

    // Attempt refresh using cookie
    const refreshToken = request.cookies?.[this.refreshCookieName] as
      | string
      | undefined;
    if (!refreshToken) return;
    // Validate refresh token in DB
    const stored = await this.refreshRepo.findOne({
      where: { token: refreshToken, isRevoked: false },
    });
    if (!stored || !stored.isValid) return;

    // Rotate refresh token if close to expiry (e.g., < 1 day) or always rotate for extra security
    const rotateWindowSeconds = Number(
      this.configService.get('JWT_REFRESH_ROTATE_WINDOW_SECONDS') || 86400,
    );
    const refreshExpLeft = Math.floor(
      (stored.expiresAt.getTime() - Date.now()) / 1000,
    );

    const newAccess = await this.signAccessToken(
      request.user.id,
      request.user.email,
      request.user.role,
      stored.id,
    );
    let newRefreshTokenValue: string | undefined = refreshToken;
    if (refreshExpLeft < rotateWindowSeconds) {
      // Soft rotate: invalidate old, create new
      stored.isRevoked = true;
      await this.refreshRepo.save(stored);
      const newRtId = uuid();
      const newRtExpires = new Date();
      const cfg = this.configService.get<string>('JWT_REFRESH_DAYS');
      let ndays = Number(cfg ?? 7);
      if (!Number.isFinite(ndays) || ndays <= 0) ndays = 7;
      newRtExpires.setDate(newRtExpires.getDate() + ndays);
      const newRtValue = uuid().replace(/-/g, '') + uuid().replace(/-/g, '');
      await this.refreshRepo.insert({
        id: newRtId,
        token: newRtValue,
        userId: request.user.id,
        expiresAt: newRtExpires,
        isRevoked: false,
      });
      newRefreshTokenValue = newRtValue;
      this.setRefreshCookie(response, newRefreshTokenValue, newRtExpires);
    }

    // Set new access token in a response header so client can pick it up (or could use response body via interceptor)
    response.setHeader('x-access-token', newAccess);
  }

  private async signAccessToken(
    userId: string,
    email: string,
    role: string,
    refreshTokenId?: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, email, role, rtj: refreshTokenId },
      {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
      },
    );
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
