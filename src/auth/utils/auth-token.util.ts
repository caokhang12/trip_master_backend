import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JWT token utility for optimized token generation and validation
 * Centralizes token operations and caches configuration values
 */
export class AuthTokenUtil {
  private static accessSecret: string;
  private static refreshSecret: string;
  private static accessExpiresIn: string;
  private static refreshExpiresIn: string;

  /**
   * Initialize token utility with configuration values
   * Called once during service instantiation for performance
   */
  static initialize(configService: ConfigService): void {
    this.accessSecret =
      configService.get('JWT_ACCESS_SECRET') || 'fallback-access-secret';
    this.refreshSecret =
      configService.get('JWT_REFRESH_SECRET') || 'fallback-refresh-secret';
    this.accessExpiresIn = configService.get('JWT_ACCESS_EXPIRES_IN') || '15m';
    this.refreshExpiresIn = configService.get('JWT_REFRESH_EXPIRES_IN') || '7d';
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
      secret: this.accessSecret,
      expiresIn: this.accessExpiresIn,
    });

    const refreshToken = jwtService.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiresIn,
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
      secret: this.refreshSecret,
    });
  }

  /**
   * Get refresh secret for strategy configuration
   */
  static getRefreshSecret(): string {
    return this.refreshSecret;
  }

  /**
   * Get access secret for strategy configuration
   */
  static getAccessSecret(): string {
    return this.accessSecret;
  }
}
