import { BadRequestException } from '@nestjs/common';
import { UserEntity } from '../../schemas/user.entity';

/**
 * Authentication validation utility functions
 * Centralized validation logic to eliminate code duplication
 */
export class AuthValidationUtil {
  /**
   * Password validation regex pattern
   */
  static readonly PASSWORD_REGEX =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

  /**
   * Password validation error message
   */
  static readonly PASSWORD_ERROR_MESSAGE =
    'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character';

  /**
   * Email validation error message
   */
  static readonly EMAIL_ERROR_MESSAGE = 'Please provide a valid email address';

  /**
   * Validate user lookup result and throw appropriate error
   * @param user - User entity or null
   * @param errorMessage - Custom error message
   */
  static validateUserExists(
    user: any,
    errorMessage: string = 'User not found',
  ): asserts user is NonNullable<typeof user> {
    if (!user) {
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Validate email verification status
   * @param user - User entity
   */
  static validateEmailNotVerified(user: UserEntity): void {
    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }
  }
}
