import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  Matches,
  MaxLength,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for user registration
 */
export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description:
      'User password - must contain at least 8 characters with uppercase, lowercase, number and special character',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName?: string;

  @ApiProperty({
    description:
      'User home country for localized content and currency preferences',
    example: 'Vietnam',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Home country must be a string' })
  @MaxLength(100, { message: 'Home country must not exceed 100 characters' })
  homeCountry?: string;

  @ApiProperty({
    description: 'User preferred language for the application interface',
    example: 'vi',
    enum: ['en', 'vi', 'zh', 'ja', 'ko', 'th', 'fr', 'de', 'es'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Preferred language must be a string' })
  @IsIn(['en', 'vi', 'zh', 'ja', 'ko', 'th', 'fr', 'de', 'es'], {
    message:
      'Preferred language must be one of: en, vi, zh, ja, ko, th, fr, de, es',
  })
  preferredLanguage?: string;
}

/**
 * DTO for user login
 */
export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123!',
  })
  @IsString({ message: 'Password must be a string' })
  password: string;
}

/**
 * DTO for token refresh
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: 'JWT refresh token',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  @IsString({ message: 'Refresh token must be a string' })
  refreshToken: string;
}

/**
 * DTO for email verification
 */
export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token received via email',
    example: 'abc123def456ghi789jkl012mno345pqr678stu901',
  })
  @IsString({ message: 'Verification token must be a string' })
  token: string;
}

/**
 * DTO for resend email verification
 */
export class ResendVerificationDto {
  @ApiProperty({
    description: 'User email address to resend verification to',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

/**
 * DTO for forgot password request
 */
export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email address to send password reset instructions',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

/**
 * DTO for password reset
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'abc123def456ghi789jkl012mno345pqr678stu901',
  })
  @IsString({ message: 'Reset token must be a string' })
  token: string;

  @ApiProperty({
    description:
      'New password - must contain at least 8 characters with uppercase, lowercase, number and special character',
    example: 'NewSecurePass123!',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  newPassword: string;
}

/**
 * DTO for social login
 */
export class SocialLoginDto {
  @ApiProperty({
    description: 'Social media provider',
    enum: ['google', 'facebook', 'apple'],
    example: 'google',
  })
  @IsString({ message: 'Provider must be a string' })
  @IsEnum(['google', 'facebook', 'apple'], {
    message: 'Provider must be one of: google, facebook, apple',
  })
  provider: 'google' | 'facebook' | 'apple';

  @ApiProperty({
    description: 'Access token from the social media provider',
    example: 'ya29.a0ARrdaM9...',
  })
  @IsString({ message: 'Access token must be a string' })
  accessToken: string;

  @ApiProperty({
    description:
      'ID token from the social media provider (optional, required for some providers)',
    example: 'eyJhbGciOiJSUzI1NiIs...',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'ID token must be a string' })
  idToken?: string;
}
