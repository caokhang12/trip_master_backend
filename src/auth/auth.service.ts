import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../users/user.service';
import { EmailService } from '../email/email.service';
import { RefreshTokenService } from './services/refresh-token.service';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SocialLoginDto,
} from './dto/auth.dto';
import {
  AuthResponseData,
  InternalAuthResponseData,
  SessionData,
} from '../shared/types/base-response.types';
import { DeviceInfo, DeviceInfoUtil } from './utils/device-info.util';
import { AuthTokenUtil } from './utils/auth-token.util';
import { AuthResponseUtil } from './utils/auth-response.util';
import { TokenExpiryUtil } from './utils/token-expiry.util';

/**
 * Authentication service with JWT token management and security validation
 * Optimized for performance and reduced code duplication
 */
@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * Initialize service with cached configuration values
   */
  onModuleInit(): void {
    AuthTokenUtil.initialize(this.configService);
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseData> {
    const user = await this.userService.createUser({
      email: registerDto.email,
      password: registerDto.password,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
    });

    // Generate email verification token for account activation
    const verificationToken = AuthResponseUtil.generateToken();
    await this.userService.setEmailVerificationToken(
      user.id,
      verificationToken,
    );

    // Send verification email
    const emailSent = await this.emailService.sendVerificationEmail(
      user.email,
      verificationToken,
      user.firstName,
      'en',
    );

    if (!emailSent) {
      this.logger.warn(`Failed to send verification email to ${user.email}`);
    }

    const tokens = AuthTokenUtil.generateTokens(
      this.jwtService,
      user.id,
      user.email,
    );

    // Create and store refresh token
    await this.refreshTokenService.createRefreshToken(
      user,
      tokens.refresh_token,
      AuthTokenUtil.calculateRefreshTokenExpiry(),
    );

    return AuthResponseUtil.buildAuthResponse(this.userService, user, tokens);
  }

  async login(
    loginDto: LoginDto,
    deviceInfo?: DeviceInfo,
  ): Promise<InternalAuthResponseData> {
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user) {
      // Increment failed login attempts for non-existent users too
      this.logger.warn(
        `Login attempt for non-existent email: ${loginDto.email}`,
      );
      throw new UnauthorizedException('Email is not registered');
    }

    // Check if account is locked
    if (user.isLocked) {
      this.logger.warn(`Login attempt for locked account: ${user.email}`);
      throw new UnauthorizedException(
        'Account temporarily locked due to multiple failed login attempts',
      );
    }

    const isValidPassword = await this.userService.verifyPassword(
      user,
      loginDto.password,
    );

    if (!isValidPassword) {
      // Increment failed login attempts
      user.incrementFailedAttempts();
      await this.userService.updateUserFields(user.id, {
        failedLoginAttempts: user.failedLoginAttempts,
        lockedUntil: user.lockedUntil,
      });

      this.logger.warn(`Failed login attempt for user: ${user.email}`);
      throw new UnauthorizedException('Email or password is incorrect');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0) {
      user.resetFailedAttempts();
    }

    // Update last login information
    const now = new Date();
    await this.userService.updateUserFields(user.id, {
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil,
      lastLoginAt: now,
      lastLoginIp: deviceInfo?.ip,
    });

    const tokens = AuthTokenUtil.generateTokens(
      this.jwtService,
      user.id,
      user.email,
    );

    // Create refresh token record with config-driven expiry
    const expiresAt = TokenExpiryUtil.calculateExpiry('7d');

    await this.refreshTokenService.createRefreshToken(
      user,
      tokens.refresh_token,
      expiresAt,
      deviceInfo,
    );

    this.logger.log(`User ${user.email} logged in successfully`);

    return AuthResponseUtil.buildAuthResponse(this.userService, user, tokens);
  }

  async refreshToken(
    refreshToken: string,
    deviceInfo?: DeviceInfo,
  ): Promise<InternalAuthResponseData> {
    const tokenRecord =
      await this.refreshTokenService.findValidToken(refreshToken);

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token
    await this.refreshTokenService.revokeToken(refreshToken);

    // Generate new tokens
    const tokens = AuthTokenUtil.generateTokens(
      this.jwtService,
      tokenRecord.user.id,
      tokenRecord.user.email,
    );

    // Create new refresh token record with config-driven expiry
    const expiresAt = TokenExpiryUtil.calculateExpiry('7d');

    await this.refreshTokenService.createRefreshToken(
      tokenRecord.user,
      tokens.refresh_token,
      expiresAt,
      deviceInfo,
    );

    // Update last used timestamp
    await this.refreshTokenService.updateLastUsed(tokenRecord.id);

    this.logger.log(`Refresh token used for user ${tokenRecord.user.email}`);

    return AuthResponseUtil.buildAuthResponse(
      this.userService,
      tokenRecord.user,
      tokens,
    );
  }

  /**
   * Verify email with verification token
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<boolean> {
    // Get user details before verification for welcome email
    const userResult = await this.userService.verifyEmailAndGetUser(
      verifyEmailDto.token,
    );

    if (!userResult) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Send welcome email after successful verification
    if (userResult) {
      const welcomeEmailSent = await this.emailService.sendWelcomeEmail(
        userResult.email,
        userResult.firstName,
        (userResult.preferredLanguage as 'en' | 'vi') || 'en',
      );

      if (!welcomeEmailSent) {
        this.logger.warn(`Failed to send welcome email to ${userResult.email}`);
      }
    }

    return true;
  }

  /**
   * Resend email verification
   */
  async resendVerification(resendDto: ResendVerificationDto): Promise<boolean> {
    const user = await this.userService.findByEmail(resendDto.email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const verificationToken = AuthResponseUtil.generateToken();
    await this.userService.setEmailVerificationToken(
      user.id,
      verificationToken,
    );

    // Send verification email
    const emailSent = await this.emailService.sendVerificationEmail(
      user.email,
      verificationToken,
      user.firstName,
      (user.preferredLanguage as 'en' | 'vi') || 'en',
    );

    if (!emailSent) {
      this.logger.warn(`Failed to send verification email to ${user.email}`);
    }

    return true;
  }

  /**
   * Send forgot password email
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<boolean> {
    const resetToken = AuthResponseUtil.generateToken();
    const isUserExists = await this.userService.setPasswordResetToken(
      forgotPasswordDto.email,
      resetToken,
    );

    if (isUserExists) {
      // Get user details for personalized email
      const user = await this.userService.findByEmail(forgotPasswordDto.email);
      if (user) {
        const emailSent = await this.emailService.sendPasswordResetEmail(
          forgotPasswordDto.email,
          resetToken,
          user.firstName,
          (user.preferredLanguage as 'en' | 'vi') || 'en',
        );

        if (!emailSent) {
          this.logger.warn(
            `Failed to send password reset email to ${forgotPasswordDto.email}`,
          );
        }
      }
    }

    // Always return true to prevent email enumeration
    return true;
  }

  /**
   * Reset password with reset token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<boolean> {
    const isReset = await this.userService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );

    if (!isReset) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    return true;
  }

  /**
   * Social login (not yet implemented)
   * TODO: Implement social login validation with respective providers
   */
  socialLogin(socialLoginDto: SocialLoginDto): Promise<AuthResponseData> {
    this.logger.warn(
      `Social login attempted for provider: ${socialLoginDto.provider} - Feature not implemented`,
    );

    throw new BadRequestException(
      'Social login feature is not yet implemented. Please use email/password registration.',
    );
  }

  /**
   * Logout user by revoking refresh token
   */
  async logout(userId: string, refreshToken?: string): Promise<boolean> {
    if (refreshToken) {
      await this.refreshTokenService.revokeToken(refreshToken);
    } else {
      await this.refreshTokenService.revokeAllUserTokens(userId);
    }
    this.logger.log(`User ${userId} logged out`);
    return true;
  }

  /**
   * Logout user from all devices
   */
  async logoutAll(userId: string): Promise<boolean> {
    await this.refreshTokenService.revokeAllUserTokens(userId);
    this.logger.log(`User ${userId} logged out from all devices`);
    return true;
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(
    userId: string,
    currentRefreshToken?: string,
  ): Promise<SessionData[]> {
    const sessions =
      await this.refreshTokenService.getUserActiveSessions(userId);

    return sessions.map((session) => ({
      id: session.id,
      deviceInfo: DeviceInfoUtil.sanitizeForResponse(session.deviceInfo || {}),
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      isCurrent: session.token === currentRefreshToken,
    }));
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    const success = await this.refreshTokenService.revokeSession(
      userId,
      sessionId,
    );
    if (success) {
      this.logger.log(`Session ${sessionId} revoked for user ${userId}`);
    }
    return success;
  }

  /**
   * Clean up expired refresh tokens (to be called periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    return this.refreshTokenService.cleanupExpiredTokens();
  }
}
