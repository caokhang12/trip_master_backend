import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../users/user.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SocialLoginDto,
} from './dto/auth.dto';
import { AuthResponseData } from '../shared/types/base-response.types';
import { AuthValidationUtil } from './utils/auth-validation.util';
import { AuthTokenUtil } from './utils/auth-token.util';
import { AuthResponseUtil } from './utils/auth-response.util';

/**
 * Authentication service with JWT token management and security validation
 * Optimized for performance and reduced code duplication
 */
@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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

    // TODO: Send verification email
    // await this.emailService.sendVerificationEmail(user.email, verificationToken);

    const tokens = AuthTokenUtil.generateTokens(
      this.jwtService,
      user.id,
      user.email,
    );

    return AuthResponseUtil.executeAuthFlow(this.userService, tokens, user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseData> {
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('You have not register this email yet');
    }

    const isValidPassword = await this.userService.verifyPassword(
      user,
      loginDto.password,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = AuthTokenUtil.generateTokens(
      this.jwtService,
      user.id,
      user.email,
    );

    return AuthResponseUtil.executeAuthFlow(this.userService, tokens, user);
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseData> {
    try {
      const payload = AuthTokenUtil.verifyRefreshToken(
        this.jwtService,
        refreshTokenDto.refreshToken,
      );

      const user = await this.userService.findById(payload.sub);
      if (!user || user.refreshToken !== refreshTokenDto.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = AuthTokenUtil.generateTokens(
        this.jwtService,
        user.id,
        user.email,
      );

      return AuthResponseUtil.executeAuthFlow(this.userService, tokens, user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Verify email with verification token
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<boolean> {
    const isVerified = await this.userService.verifyEmail(verifyEmailDto.token);
    AuthValidationUtil.validateTokenOperation(
      isVerified,
      'Invalid or expired verification token',
    );
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

    // TODO: Send verification email
    // await this.emailService.sendVerificationEmail(user.email, verificationToken);

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
      // TODO: Send password reset email
      // await this.emailService.sendPasswordResetEmail(forgotPasswordDto.email, resetToken);
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

    AuthValidationUtil.validateTokenOperation(
      isReset,
      'Invalid or expired reset token',
    );

    return true;
  }

  /**
   * Social login (placeholder implementation)
   */
  socialLogin(socialLoginDto: SocialLoginDto): Promise<AuthResponseData> {
    // TODO: Implement social login validation with respective providers
    // For now, this is a placeholder that would validate the access token
    // with the respective social provider and create/login user
    console.log(
      'Social login attempted for provider:',
      socialLoginDto.provider,
    );

    throw new BadRequestException('Social login not implemented yet');
  }

  /**
   * Logout user by invalidating refresh token
   */
  async logout(userId: string): Promise<boolean> {
    await this.userService.updateRefreshToken(userId, null);
    return true;
  }
}
