import { Request } from 'express';
import { UserRole } from 'src/shared/types/base-response.types';

/**
 * Represents an authenticated user from JWT token
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  refreshTokenId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Express Request with authenticated user
 * Used across all controllers and guards for type-safe user access
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
