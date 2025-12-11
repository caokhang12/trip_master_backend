import { SetMetadata } from '@nestjs/common';
import { MemberRole } from 'src/schemas/trip-member.entity';

export const REQUIRED_ROLE_KEY = 'requiredRole';

/**
 * Decorator to require a minimum role for trip access
 * @param role Minimum required role
 */
export const RequireRole = (role: MemberRole) =>
  SetMetadata(REQUIRED_ROLE_KEY, role);
