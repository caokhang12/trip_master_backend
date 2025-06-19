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
      'Password with 8+ chars, uppercase, lowercase, number and special character',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
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
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({
    description:
      'User home country for localized content and currency preferences',
    example: 'Vietnam',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  homeCountry?: string;

  @ApiProperty({
    description: 'User preferred language for the application interface',
    example: 'vi',
    enum: ['en', 'vi', 'zh', 'ja', 'ko', 'th', 'fr', 'de', 'es'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'vi', 'zh', 'ja', 'ko', 'th', 'fr', 'de', 'es'])
  preferredLanguage?: string;
}

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'admin@tripmaster.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'admin123',
  })
  @IsString({ message: 'Password must be a string' })
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'JWT refresh token',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  @IsString({ message: 'Refresh token must be a string' })
  refreshToken: string;
}

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token received via email',
    example: 'abc123def456ghi789jkl012mno345pqr678stu901',
  })
  @IsString({ message: 'Verification token must be a string' })
  token: string;
}

export class ResendVerificationDto {
  @ApiProperty({
    description: 'User email address to resend verification to',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email address to send password reset instructions',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

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
