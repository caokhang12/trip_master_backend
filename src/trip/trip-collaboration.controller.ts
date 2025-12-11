import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TripCollaborationService } from './trip-collaboration.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { TripMembersQueryDto } from './dto/trip-members-query.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TripPermissionGuard } from './guards/trip-permission.guard';
import { RequireRole } from './decorators/require-role.decorator';
import { MemberRole } from 'src/schemas/trip-member.entity';
import { AuthenticatedRequest } from 'src/auth/types/authenticated-request';
import { ResponseUtil } from 'src/shared/utils/response.util';

@ApiTags('Trip Collaboration')
@Controller('trips')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TripCollaborationController {
  constructor(
    private readonly collaborationService: TripCollaborationService,
  ) {}

  @Post(':tripId/members/invite')
  @UseGuards(TripPermissionGuard)
  @RequireRole(MemberRole.EDITOR)
  @ApiOperation({ summary: 'Invite a member to collaborate on a trip' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @ApiResponse({ status: 201, description: 'Invitation sent successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Trip not found' })
  @ApiResponse({
    status: 409,
    description: 'User already invited or is a member',
  })
  async inviteMember(
    @Param('tripId') tripId: string,
    @Body() dto: InviteMemberDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const invitation = await this.collaborationService.inviteMember(
      tripId,
      req.user.id,
      dto,
    );
    return ResponseUtil.success(invitation, HttpStatus.CREATED);
  }

  @Get(':tripId/members')
  @UseGuards(TripPermissionGuard)
  @RequireRole(MemberRole.VIEWER)
  @ApiOperation({ summary: 'Get all members of a trip' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @ApiResponse({ status: 200, description: 'Members retrieved successfully' })
  async getTripMembers(
    @Param('tripId') tripId: string,
    @Query() query: TripMembersQueryDto,
  ) {
    const result = await this.collaborationService.getTripMembers({
      ...query,
      tripId,
    });
    return ResponseUtil.success(result);
  }

  @Delete(':tripId/members/:userId')
  @UseGuards(TripPermissionGuard)
  @RequireRole(MemberRole.EDITOR)
  @ApiOperation({ summary: 'Remove a member from a trip' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async removeMember(
    @Param('tripId') tripId: string,
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.collaborationService.removeMember(tripId, req.user.id, userId);
    return ResponseUtil.success({ deleted: true });
  }

  @Patch(':tripId/members/:userId/role')
  @UseGuards(TripPermissionGuard)
  @RequireRole(MemberRole.OWNER)
  @ApiOperation({ summary: 'Update a member role' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @ApiParam({ name: 'userId', description: 'User ID to update' })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  @ApiResponse({ status: 403, description: 'Only owners can change roles' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async updateMemberRole(
    @Param('tripId') tripId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const resp = await this.collaborationService.updateMemberRole(
      tripId,
      req.user.id,
      userId,
      dto,
    );
    return ResponseUtil.success(resp);
  }

  @Get(':tripId/invitations')
  @UseGuards(TripPermissionGuard)
  @RequireRole(MemberRole.EDITOR)
  @ApiOperation({ summary: 'Get all pending invitations for a trip' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitations retrieved successfully',
  })
  async getTripInvitations(@Param('tripId') tripId: string) {
    const invitations =
      await this.collaborationService.getTripInvitations(tripId);
    return ResponseUtil.success(invitations);
  }

  @Post(':tripId/invitations/:invitationId/resend')
  @UseGuards(TripPermissionGuard)
  @RequireRole(MemberRole.EDITOR)
  @ApiOperation({ summary: 'Resend an invitation' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @ApiParam({ name: 'invitationId', description: 'Invitation ID' })
  @ApiResponse({ status: 200, description: 'Invitation resent successfully' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async resendInvitation(
    @Param('tripId') tripId: string,
    @Param('invitationId') invitationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.collaborationService.resendInvitation(
      tripId,
      req.user.id,
      invitationId,
    );
    return ResponseUtil.success({ resent: true });
  }

  @Get(':tripId/activity-logs')
  @UseGuards(TripPermissionGuard)
  @RequireRole(MemberRole.VIEWER)
  @ApiOperation({ summary: 'Get trip activity logs' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @ApiResponse({
    status: 200,
    description: 'Activity logs retrieved successfully',
  })
  async getTripActivityLogs(@Param('tripId') tripId: string) {
    const logs = await this.collaborationService.getTripActivityLogs(tripId);
    return ResponseUtil.success(logs);
  }

  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept an invitation' })
  @ApiResponse({ status: 200, description: 'Invitation accepted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired invitation' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const member = await this.collaborationService.acceptInvitation(
      req.user.id,
      dto,
    );
    return ResponseUtil.success(member, HttpStatus.CREATED);
  }

  @Post('invitations/:token/decline')
  @ApiOperation({ summary: 'Decline an invitation' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({ status: 200, description: 'Invitation declined successfully' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async declineInvitation(
    @Param('token') token: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.collaborationService.declineInvitation(req.user.id, token);
    return ResponseUtil.success({ declined: true });
  }

  @Get('invitations/:token')
  @ApiOperation({ summary: 'Get invitation details by token' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({ status: 200, description: 'Invitation details retrieved' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async getInvitationByToken(@Param('token') token: string) {
    const invitation =
      await this.collaborationService.getInvitationByToken(token);
    return ResponseUtil.success(invitation);
  }
}
