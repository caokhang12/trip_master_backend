import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuthValidationUtil } from '../utils/auth-validation.util';

/**
 * Base email validation DTO
 * Centralizes email validation pattern
 */
export class BaseEmailDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: AuthValidationUtil.EMAIL_ERROR_MESSAGE })
  email: string;
}

/**
 * Base password validation DTO
 * Centralizes password validation pattern
 */
export class BasePasswordDto {
  @ApiProperty({
    description:
      'Password with 8+ chars, uppercase, lowercase, number and special character',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(AuthValidationUtil.PASSWORD_REGEX, {
    message: AuthValidationUtil.PASSWORD_ERROR_MESSAGE,
  })
  password: string;
}

/**
 * Base email and password validation DTO
 * Combines email and password validation for login/register
 */
export class BaseEmailPasswordDto extends BaseEmailDto {
  @ApiProperty({
    description:
      'Password with 8+ chars, uppercase, lowercase, number and special character',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(AuthValidationUtil.PASSWORD_REGEX, {
    message: AuthValidationUtil.PASSWORD_ERROR_MESSAGE,
  })
  password: string;
}

/**
 * Base new password validation DTO for password reset
 * Centralizes new password validation pattern
 */
export class BaseNewPasswordDto {
  @ApiProperty({
    description:
      'New password - must contain at least 8 characters with uppercase, lowercase, number and special character',
    example: 'NewSecurePass123!',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(AuthValidationUtil.PASSWORD_REGEX, {
    message: AuthValidationUtil.PASSWORD_ERROR_MESSAGE,
  })
  newPassword: string;
}

/**
 * Base token validation DTO
 * Centralizes token validation pattern
 */
export class BaseTokenDto {
  @ApiProperty({
    description: 'Authentication token',
    example: 'abc123def456ghi789jkl012mno345pqr678stu901',
  })
  @IsString({ message: 'Token must be a string' })
  token: string;
}

/**
 * Base token with new password DTO
 * Combines token and new password validation for password reset
 */
export class BaseTokenNewPasswordDto extends BaseTokenDto {
  @ApiProperty({
    description:
      'New password - must contain at least 8 characters with uppercase, lowercase, number and special character',
    example: 'NewSecurePass123!',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(AuthValidationUtil.PASSWORD_REGEX, {
    message: AuthValidationUtil.PASSWORD_ERROR_MESSAGE,
  })
  newPassword: string;
}
