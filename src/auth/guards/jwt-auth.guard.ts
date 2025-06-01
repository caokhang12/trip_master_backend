import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT authentication guard for protecting routes
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/**
 * JWT refresh token guard for token refresh endpoints
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
