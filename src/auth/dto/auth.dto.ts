import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';

/**
 * DTO for user registration
 */
export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  lastName?: string;
}

/**
 * DTO for user login
 */
export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  password: string;
}

/**
 * DTO for token refresh
 */
export class RefreshTokenDto {
  @IsString({ message: 'Refresh token must be a string' })
  refreshToken: string;
}

/**
 * DTO for email verification
 */
export class VerifyEmailDto {
  @IsString({ message: 'Verification token must be a string' })
  token: string;
}

/**
 * DTO for resend email verification
 */
export class ResendVerificationDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

/**
 * DTO for forgot password request
 */
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

/**
 * DTO for password reset
 */
export class ResetPasswordDto {
  @IsString({ message: 'Reset token must be a string' })
  token: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;
}

/**
 * DTO for social login
 */
export class SocialLoginDto {
  @IsString({ message: 'Provider must be a string' })
  @IsEnum(['google', 'facebook', 'apple'], {
    message: 'Provider must be one of: google, facebook, apple',
  })
  provider: 'google' | 'facebook' | 'apple';

  @IsString({ message: 'Access token must be a string' })
  accessToken: string;

  @IsOptional()
  @IsString({ message: 'ID token must be a string' })
  idToken?: string;
}
