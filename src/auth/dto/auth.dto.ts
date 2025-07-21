import { IsOptional, IsEnum, IsString, IsIn, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  BaseEmailDto,
  BaseTokenDto,
  BaseEmailPasswordDto,
  BaseTokenNewPasswordDto,
} from './base-auth.dto';

export class RegisterDto extends BaseEmailPasswordDto {
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

export class LoginDto extends BaseEmailPasswordDto {}

export class VerifyEmailDto extends BaseTokenDto {}

export class ResendVerificationDto extends BaseEmailDto {}

export class ForgotPasswordDto extends BaseEmailDto {}

export class ResetPasswordDto extends BaseTokenNewPasswordDto {}

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
