import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
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

/**
 * Service for handling authentication operations
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseData> {
    const user = await this.userService.createUser({
      email: registerDto.email,
      password: registerDto.password,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
    });

    // Generate email verification token
    const verificationToken = uuidv4();
    await this.userService.setEmailVerificationToken(
      user.id,
      verificationToken,
    );

    // TODO: Send verification email
    // await this.emailService.sendVerificationEmail(user.email, verificationToken);

    const tokens = this.generateTokens(user.id, user.email);
    await this.userService.updateRefreshToken(user.id, tokens.refresh_token);

    return {
      ...tokens,
      user_profile: this.userService.transformToProfileData(user),
    };
  }

  /**
   * Login user with email and password
   */
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

    const tokens = this.generateTokens(user.id, user.email);
    await this.userService.updateRefreshToken(user.id, tokens.refresh_token);

    return {
      ...tokens,
      user_profile: this.userService.transformToProfileData(user),
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseData> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      }) as { sub: string; email: string };

      const user = await this.userService.findById(payload.sub);
      if (!user || user.refreshToken !== refreshTokenDto.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = this.generateTokens(user.id, user.email);
      await this.userService.updateRefreshToken(user.id, tokens.refresh_token);

      return {
        ...tokens,
        user_profile: this.userService.transformToProfileData(user),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Verify email with verification token
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<boolean> {
    const isVerified = await this.userService.verifyEmail(verifyEmailDto.token);
    if (!isVerified) {
      throw new BadRequestException('Invalid or expired verification token');
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

    const verificationToken = uuidv4();
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
    const resetToken = uuidv4();
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

    if (!isReset) {
      throw new BadRequestException('Invalid or expired reset token');
    }

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

  /**
   * Generate access and refresh tokens
   */
  private generateTokens(
    userId: string,
    email: string,
  ): { access_token: string; refresh_token: string } {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
