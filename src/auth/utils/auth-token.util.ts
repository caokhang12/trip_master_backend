import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '../config/auth.config';
import { TokenExpiryUtil } from './token-expiry.util';

/**
 * JWT token utility for optimized token generation and validation
 * Centralizes token operations and caches configuration values
 */
export class AuthTokenUtil {
  private static authConfig: AuthConfig['jwt'];

  /**
   * Initialize token utility with configuration values
   * Called once during service instantiation for performance
   */
  static initialize(configService: ConfigService): void {
    this.authConfig = configService.get<AuthConfig['jwt']>('auth.jwt') || {
      accessSecret: 'fallback-access-secret',
      refreshSecret: 'fallback-refresh-secret',
      accessExpiresIn: '15m',
      refreshExpiresIn: '7d',
    };
  }

  /**
   * Generate both access and refresh tokens efficiently
   * @param jwtService - JWT service instance
   * @param userId - User identifier
   * @param email - User email
   */
  static generateTokens(
    jwtService: JwtService,
    userId: string,
    email: string,
  ): { access_token: string; refresh_token: string } {
    const payload = { sub: userId, email };

    const accessToken = jwtService.sign(payload, {
      secret: this.authConfig.accessSecret,
      expiresIn: this.authConfig.accessExpiresIn,
    });

    const refreshToken = jwtService.sign(payload, {
      secret: this.authConfig.refreshSecret,
      expiresIn: this.authConfig.refreshExpiresIn,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Verify refresh token and extract payload
   * @param jwtService - JWT service instance
   * @param token - Refresh token to verify
   */
  static verifyRefreshToken(
    jwtService: JwtService,
    token: string,
  ): { sub: string; email: string } {
    return jwtService.verify(token, {
      secret: this.authConfig.refreshSecret,
    });
  }

  /**
   * Get refresh secret for strategy configuration
   */
  static getRefreshSecret(): string {
    return this.authConfig.refreshSecret;
  }

  /**
   * Get access secret for strategy configuration
   */
  static getAccessSecret(): string {
    return this.authConfig.accessSecret;
  }

  /**
   * Calculate refresh token expiry date using centralized utility
   */
  static calculateRefreshTokenExpiry(): Date {
    const expiresIn = this.authConfig.refreshExpiresIn;
    return TokenExpiryUtil.calculateExpiry(expiresIn);
  }
}
