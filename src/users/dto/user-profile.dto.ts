import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  IsEmail,
  IsIn,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Base user name DTO
 */
export class UserNameDto {
  @ApiProperty({
    description: 'User first name',
    example: 'John',
    maxLength: 50,
  })
  @IsString({ message: 'First name must be a string' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    maxLength: 50,
  })
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName: string;
}

/**
 * Optional user name DTO
 */
export class OptionalUserNameDto {
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  @Matches(/^[a-zA-ZÀ-ỹ\s]+$/, {
    message: 'First name can only contain letters and spaces',
  })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  @Matches(/^[a-zA-ZÀ-ỹ\s]+$/, {
    message: 'Last name can only contain letters and spaces',
  })
  lastName?: string;
}

/**
 * User email DTO
 */
export class UserEmailDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

/**
 * User location fields DTO
 */
export class UserLocationDto {
  @ApiPropertyOptional({
    description:
      'User home country for localized content and currency preferences',
    example: 'Vietnam',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Home country must be a string' })
  @MaxLength(100, { message: 'Home country must not exceed 100 characters' })
  homeCountry?: string;

  @ApiPropertyOptional({
    description: 'User preferred language for the application interface',
    example: 'vi',
    enum: ['en', 'vi', 'zh', 'ja', 'ko', 'th', 'fr', 'de', 'es'],
  })
  @IsOptional()
  @IsString({ message: 'Preferred language must be a string' })
  @IsIn(['en', 'vi', 'zh', 'ja', 'ko', 'th', 'fr', 'de', 'es'], {
    message:
      'Preferred language must be one of: en, vi, zh, ja, ko, th, fr, de, es',
  })
  preferredLanguage?: string;

  @ApiPropertyOptional({
    description: 'User preferred currency for budgets and expenses',
    example: 'VND',
    enum: [
      'VND',
      'USD',
      'EUR',
      'GBP',
      'JPY',
      'THB',
      'SGD',
      'AUD',
      'CAD',
      'CNY',
      'KRW',
    ],
  })
  @IsOptional()
  @IsString({ message: 'Preferred currency must be a string' })
  @IsIn(
    [
      'VND',
      'USD',
      'EUR',
      'GBP',
      'JPY',
      'THB',
      'SGD',
      'AUD',
      'CAD',
      'CNY',
      'KRW',
    ],
    {
      message:
        'Preferred currency must be one of: VND, USD, EUR, GBP, JPY, THB, SGD, AUD, CAD, CNY, KRW',
    },
  )
  preferredCurrency?: string;
}

/**
 * User avatar DTO
 */
export class UserAvatarDto {
  @ApiPropertyOptional({
    description: 'User avatar image URL',
    example: 'https://example.com/avatars/john-doe.jpg',
  })
  @IsOptional()
  @IsString({ message: 'Avatar URL must be a string' })
  @IsUrl({}, { message: 'Avatar URL must be a valid URL' })
  avatarUrl?: string;
}

/**
 * User profile DTO
 */
export class UserProfileDto extends OptionalUserNameDto {
  @ApiPropertyOptional({
    description: 'User avatar image URL',
    example: 'https://example.com/avatars/john-doe.jpg',
    format: 'url',
  })
  @IsOptional()
  @IsString({ message: 'Avatar URL must be a string' })
  @IsUrl({}, { message: 'Avatar URL must be a valid URL' })
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'User preferred language for the application interface',
    example: 'vi',
  })
  @IsOptional()
  @IsString({ message: 'Preferred language must be a string' })
  preferredLanguage?: string;

  @ApiPropertyOptional({
    description: 'User preferred currency for budgets and expenses',
    example: 'VND',
  })
  @IsOptional()
  @IsString({ message: 'Preferred currency must be a string' })
  preferredCurrency?: string;

  @ApiPropertyOptional({
    description: 'User home country',
    example: 'Vietnam',
  })
  @IsOptional()
  @IsString({ message: 'Home country must be a string' })
  homeCountry?: string;
}
