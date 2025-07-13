import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '../config/auth.config';

/**
 * Lightweight auth configuration service
 * Replaces AuthOptimizationService with better performance and type safety
 */
@Injectable()
export class AuthConfigService {
  private readonly securityConfig: AuthConfig['security'];
  private readonly rateLimitConfig: AuthConfig['rateLimit'];
  private readonly cookieConfig: AuthConfig['cookies'];

  constructor(private readonly configService: ConfigService) {
    // Initialize configs once during construction for better performance
    this.securityConfig = this.configService.get<AuthConfig['security']>(
      'auth.security',
    ) || {
      bcryptRounds: 12,
      maxLoginAttempts: 5,
      lockoutDuration: 900000, // 15 minutes
    };

    this.rateLimitConfig = this.configService.get<AuthConfig['rateLimit']>(
      'auth.rateLimit',
    ) || {
      login: { requests: 5, window: 60000 },
      register: { requests: 3, window: 3600000 },
      forgotPassword: { requests: 3, window: 900000 },
    };

    this.cookieConfig = this.configService.get<AuthConfig['cookies']>(
      'auth.cookies',
    ) || {
      refreshToken: {
        httpOnly: true,
        secure: false,
        sameSite: 'strict' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/auth/refresh',
      },
    };
  }

  /**
   * Get security configuration
   */
  getSecurityConfig(): AuthConfig['security'] {
    return this.securityConfig;
  }

  /**
   * Get rate limit configuration
   */
  getRateLimitConfig(): AuthConfig['rateLimit'] {
    return this.rateLimitConfig;
  }

  /**
   * Get cookie configuration
   */
  getCookieConfig(): AuthConfig['cookies'] {
    return this.cookieConfig;
  }

  /**
   * Check if account should be locked based on failed attempts
   */
  shouldLockAccount(failedAttempts: number, lockedUntil?: Date): boolean {
    if (failedAttempts >= this.securityConfig.maxLoginAttempts) {
      if (!lockedUntil || lockedUntil > new Date()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate lockout expiry time
   */
  calculateLockoutExpiry(): Date {
    return new Date(Date.now() + this.securityConfig.lockoutDuration);
  }
}
