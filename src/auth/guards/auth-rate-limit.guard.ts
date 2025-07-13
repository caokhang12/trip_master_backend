import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Auth rate limiting guard - extends ThrottlerGuard
 * TODO: Implement custom rate limiting logic in Phase 2
 */
@Injectable()
export class AuthRateLimitGuard extends ThrottlerGuard {}
