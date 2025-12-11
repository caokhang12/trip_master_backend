import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_ROLE_KEY } from '../decorators/require-role.decorator';
import { MemberRole } from 'src/schemas/trip-member.entity';
import { TripCollaborationService } from '../trip-collaboration.service';
import { AuthenticatedRequest } from 'src/auth/types/authenticated-request';

@Injectable()
export class TripPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private collaborationService: TripCollaborationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.getAllAndOverride<MemberRole>(
      REQUIRED_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRole) {
      return true; // No role requirement
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get tripId from params or body
    const params = request.params as Record<string, string>;
    const body = request.body as Record<string, string>;
    const tripId = params.tripId || params.id || body.tripId;

    if (!tripId) {
      throw new ForbiddenException('Trip ID not found in request');
    }

    // Check permission
    const hasPermission = await this.collaborationService.checkPermission(
      tripId,
      user.id,
      requiredRole,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `You need ${requiredRole} role or higher to perform this action`,
      );
    }

    return true;
  }
}
