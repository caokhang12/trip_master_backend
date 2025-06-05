import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  IsEmail,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Base user name validation DTO
 */
export class BaseUserNameDto {
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
 * Optional user name validation DTO
 */
export class OptionalUserNameDto {
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName?: string;
}

/**
 * Email validation DTO
 */
export class EmailDto {
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
}

/**
 * Avatar URL validation DTO
 */
export class AvatarDto {
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
 * Combined basic user profile fields DTO
 */
export class BaseUserProfileDto extends OptionalUserNameDto {
  @ApiPropertyOptional({
    description: 'User avatar image URL',
    example: 'https://example.com/avatars/john-doe.jpg',
  })
  @IsOptional()
  @IsString({ message: 'Avatar URL must be a string' })
  @IsUrl({}, { message: 'Avatar URL must be a valid URL' })
  avatarUrl?: string;
}
