import { Request } from 'express';

/**
 * Authenticated request interface
 * Extends Express Request with user information
 */
export interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role?: string;
  };
}
