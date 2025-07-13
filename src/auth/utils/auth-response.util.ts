import { v4 as uuidv4 } from 'uuid';
import { UserService } from '../../users/user.service';
import { AuthResponseData } from '../../shared/types/base-response.types';
import { UserEntity } from '../../schemas/user.entity';

/**
 * Authentication response builder utility
 * Centralizes auth response creation patterns
 */
export class AuthResponseUtil {
  /**
   * Build complete authentication response with tokens and user profile
   * @param userService - User service instance
   * @param user - User entity
   * @param tokens - Generated JWT tokens
   */
  static buildAuthResponse(
    userService: UserService,
    user: UserEntity,
    tokens: { access_token: string; refresh_token: string },
  ): AuthResponseData {
    return {
      ...tokens,
      user_profile: userService.transformToProfileData(user),
    };
  }

  /**
   * Generate a new UUID token for email/password operations
   */
  static generateToken(): string {
    return uuidv4();
  }
}
