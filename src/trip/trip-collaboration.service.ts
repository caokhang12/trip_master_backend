import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripMemberEntity, MemberRole } from 'src/schemas/trip-member.entity';
import {
  TripInvitationEntity,
  InvitationStatus,
} from 'src/schemas/trip-invitation.entity';
import {
  TripActivityLogEntity,
  ActivityAction,
} from 'src/schemas/trip-activity-log.entity';
import { TripEntity } from 'src/schemas/trip.entity';
import { UserEntity } from 'src/schemas/user.entity';
import { EmailService } from 'src/email/email.service';
import { ConfigService } from '@nestjs/config';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { TripMembersQueryDto } from './dto/trip-members-query.dto';
import * as crypto from 'crypto';

@Injectable()
export class TripCollaborationService {
  constructor(
    @InjectRepository(TripMemberEntity)
    private readonly memberRepository: Repository<TripMemberEntity>,
    @InjectRepository(TripInvitationEntity)
    private readonly invitationRepository: Repository<TripInvitationEntity>,
    @InjectRepository(TripActivityLogEntity)
    private readonly activityLogRepository: Repository<TripActivityLogEntity>,
    @InjectRepository(TripEntity)
    private readonly tripRepository: Repository<TripEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Invite a member to collaborate on a trip
   */
  async inviteMember(
    tripId: string,
    inviterId: string,
    dto: InviteMemberDto,
  ): Promise<TripInvitationEntity> {
    // Verify trip exists
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['user'],
    });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Verify inviter has permission
    const inviterMember = await this.memberRepository.findOne({
      where: { tripId, userId: inviterId },
    });

    if (!inviterMember || inviterMember.role === MemberRole.VIEWER) {
      throw new ForbiddenException(
        'You do not have permission to invite members to this trip',
      );
    }

    // Check if user is already a member
    const invitedUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (invitedUser) {
      const existingMember = await this.memberRepository.findOne({
        where: { tripId, userId: invitedUser.id },
      });
      if (existingMember) {
        throw new ConflictException('User is already a member of this trip');
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        tripId,
        email: dto.email,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new ConflictException(
        'An invitation has already been sent to this email',
      );
    }

    // Prevent inviting owner role
    if (dto.role === MemberRole.OWNER) {
      throw new BadRequestException('Cannot invite members as owner');
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    // Create invitation
    const invitation = this.invitationRepository.create({
      tripId,
      inviterId,
      email: dto.email,
      role: dto.role,
      token,
      status: InvitationStatus.PENDING,
      expiresAt,
    });

    await this.invitationRepository.save(invitation);

    // Load inviter details
    const inviter = await this.userRepository.findOne({
      where: { id: inviterId },
    });

    if (!inviter) {
      throw new NotFoundException('Inviter not found');
    }

    // Send invitation email
    const invitationUrl = `${this.configService.get('FRONTEND_URL')}/invitations/accept/${token}`;
    const inviterName =
      inviter?.firstName && inviter?.lastName
        ? `${inviter.firstName} ${inviter.lastName}`
        : inviter?.email || 'User';

    await this.emailService.sendCollaborationInvitation(
      dto.email,
      dto.email, // recipientName (will be user's email if not registered)
      inviterName,
      trip.title,
      trip.description || '',
      trip.startDate && trip.endDate
        ? `${typeof trip.startDate === 'string' ? trip.startDate : trip.startDate.toISOString().split('T')[0]} - ${typeof trip.endDate === 'string' ? trip.endDate : trip.endDate.toISOString().split('T')[0]}`
        : 'Date not set',
      dto.role as 'owner' | 'editor' | 'viewer',
      invitationUrl,
      expiresAt.toISOString(),
      'en',
    ); // Log activity
    await this.logActivity(tripId, inviterId, ActivityAction.MEMBER_INVITED, {
      invitedEmail: dto.email,
      role: dto.role,
    });

    return invitation;
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(
    userId: string,
    dto: AcceptInvitationDto,
  ): Promise<TripMemberEntity> {
    // Find invitation
    const invitation = await this.invitationRepository.findOne({
      where: { token: dto.token },
      relations: ['trip', 'inviter'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Check if already accepted
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException('Invitation has already been accepted');
    }

    // Check if declined
    if (invitation.status === InvitationStatus.DECLINED) {
      throw new BadRequestException('Invitation has been declined');
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('Invitation has expired');
    }

    // Verify user email matches invitation
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email !== invitation.email) {
      throw new ForbiddenException(
        'This invitation was sent to a different email address',
      );
    }

    // Check if already a member
    const existingMember = await this.memberRepository.findOne({
      where: { tripId: invitation.tripId, userId },
    });

    if (existingMember) {
      throw new ConflictException('You are already a member of this trip');
    }

    // Create member
    const member = this.memberRepository.create({
      tripId: invitation.tripId,
      userId,
      role: invitation.role,
    });

    await this.memberRepository.save(member);

    // Update invitation status
    invitation.status = InvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();
    await this.invitationRepository.save(invitation);

    // Reload trip if not loaded
    if (!invitation.trip) {
      const trip = await this.tripRepository.findOne({
        where: { id: invitation.tripId },
      });
      if (!trip) {
        throw new NotFoundException('Trip not found');
      }
      invitation.trip = trip;
    }

    // Send email to inviter and member
    const inviterName =
      invitation.inviter?.firstName && invitation.inviter?.lastName
        ? `${invitation.inviter.firstName} ${invitation.inviter.lastName}`
        : invitation.inviter?.email || 'User';

    const memberName =
      user && user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user?.email || 'User';

    await this.emailService.sendMemberAdded(
      invitation.inviter.email,
      inviterName,
      memberName,
      user?.email || 'Unknown',
      invitation.trip.title,
      invitation.role as 'owner' | 'editor' | 'viewer',
      `${this.configService.get('FRONTEND_URL')}/trips/${invitation.tripId}`,
      'en',
    );

    // Log activity
    await this.logActivity(
      invitation.tripId,
      userId,
      ActivityAction.MEMBER_JOINED,
      {
        role: invitation.role,
      },
    );

    return member;
  }

  /**
   * Decline an invitation
   */
  async declineInvitation(userId: string, token: string): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email !== invitation.email) {
      throw new ForbiddenException(
        'This invitation was sent to a different email address',
      );
    }

    invitation.status = InvitationStatus.DECLINED;
    await this.invitationRepository.save(invitation);
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<TripInvitationEntity> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['trip', 'inviter'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Check if expired and update status
    if (
      invitation.status === InvitationStatus.PENDING &&
      new Date() > invitation.expiresAt
    ) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
    }

    return invitation;
  }

  /**
   * Get trip members
   */
  async getTripMembers(query: TripMembersQueryDto): Promise<{
    data: any[];
    total: number;
  }> {
    const queryBuilder = this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user');

    if (query.tripId) {
      queryBuilder.andWhere('member.tripId = :tripId', {
        tripId: query.tripId,
      });
    }

    if (query.role) {
      queryBuilder.andWhere('member.role = :role', { role: query.role });
    }

    queryBuilder.orderBy('member.joinedAt', 'ASC');

    const [members, total] = await queryBuilder.getManyAndCount();

    const data = members.map((m) => ({
      id: m.id,
      tripId: m.tripId,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      // createdAt/updatedAt not present on TripMemberEntity; exclude
      user: m.user
        ? {
            id: m.user.id,
            email: m.user.email,
            firstName: m.user.firstName,
            lastName: m.user.lastName,
            avatarUrl: m.user.avatarUrl,
          }
        : undefined,
    }));

    return { data, total };
  }

  /**
   * Remove a member from a trip
   */
  async removeMember(
    tripId: string,
    requesterId: string,
    userIdToRemove: string,
  ): Promise<void> {
    // Verify requester has permission
    const requesterMember = await this.memberRepository.findOne({
      where: { tripId, userId: requesterId },
    });

    if (!requesterMember || requesterMember.role === MemberRole.VIEWER) {
      throw new ForbiddenException(
        'You do not have permission to remove members from this trip',
      );
    }

    // Find member to remove
    const memberToRemove = await this.memberRepository.findOne({
      where: { tripId, userId: userIdToRemove },
      relations: ['user', 'trip'],
    });

    if (!memberToRemove) {
      throw new NotFoundException('Member not found');
    }

    // Cannot remove owner
    if (memberToRemove.role === MemberRole.OWNER) {
      throw new BadRequestException('Cannot remove trip owner');
    }

    // Cannot remove yourself (use leave endpoint instead)
    if (requesterId === userIdToRemove) {
      throw new BadRequestException('Use leave endpoint to remove yourself');
    }

    // Send email notification
    const memberName =
      memberToRemove.user.firstName && memberToRemove.user.lastName
        ? `${memberToRemove.user.firstName} ${memberToRemove.user.lastName}`
        : memberToRemove.user.email;

    await this.emailService.sendMemberRemoved(
      memberToRemove.user.email,
      memberName,
      memberToRemove.trip.title,
      'en',
    );

    // Remove member
    await this.memberRepository.remove(memberToRemove);

    // Log activity
    await this.logActivity(tripId, requesterId, ActivityAction.MEMBER_REMOVED, {
      removedUserId: userIdToRemove,
      removedUserEmail: memberToRemove.user.email,
    });
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    tripId: string,
    requesterId: string,
    userIdToUpdate: string,
    dto: UpdateMemberRoleDto,
  ): Promise<TripMemberEntity> {
    // Verify requester has permission (must be owner)
    const requesterMember = await this.memberRepository.findOne({
      where: { tripId, userId: requesterId },
    });

    if (!requesterMember || requesterMember.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Only trip owners can change member roles');
    }

    // Find member to update
    const memberToUpdate = await this.memberRepository.findOne({
      where: { tripId, userId: userIdToUpdate },
      relations: ['user', 'trip'],
    });

    if (!memberToUpdate) {
      throw new NotFoundException('Member not found');
    }

    // Cannot change owner role
    if (
      memberToUpdate.role === MemberRole.OWNER ||
      dto.role === MemberRole.OWNER
    ) {
      throw new BadRequestException('Cannot change owner role');
    }

    const oldRole = memberToUpdate.role;
    memberToUpdate.role = dto.role;
    await this.memberRepository.save(memberToUpdate);

    // Send email notification
    const requester = await this.userRepository.findOne({
      where: { id: requesterId },
    });

    const requesterName =
      requester && requester.firstName && requester.lastName
        ? `${requester.firstName} ${requester.lastName}`
        : requester?.email || 'User';

    const memberName =
      memberToUpdate.user.firstName && memberToUpdate.user.lastName
        ? `${memberToUpdate.user.firstName} ${memberToUpdate.user.lastName}`
        : memberToUpdate.user.email;

    await this.emailService.sendPermissionChanged(
      memberToUpdate.user.email,
      memberName,
      requesterName,
      memberToUpdate.trip.title,
      oldRole as 'owner' | 'editor' | 'viewer',
      dto.role as 'owner' | 'editor' | 'viewer',
      `${this.configService.get('FRONTEND_URL')}/trips/${tripId}`,
      'en',
    );

    // Log activity
    await this.logActivity(tripId, requesterId, ActivityAction.ROLE_CHANGED, {
      targetUserId: userIdToUpdate,
      oldRole,
      newRole: dto.role,
    });

    return memberToUpdate;
  }

  /**
   * Get trip invitations
   */
  async getTripInvitations(tripId: string): Promise<TripInvitationEntity[]> {
    return this.invitationRepository.find({
      where: { tripId },
      relations: ['inviter'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Resend invitation
   */
  async resendInvitation(
    tripId: string,
    requesterId: string,
    invitationId: string,
  ): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId, tripId },
      relations: ['trip', 'inviter'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Can only resend pending invitations');
    }

    // Update expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    invitation.expiresAt = expiresAt;
    await this.invitationRepository.save(invitation);

    // Resend email
    const invitationUrl = `${this.configService.get('FRONTEND_URL')}/invitations/accept/${invitation.token}`;
    const inviterName =
      invitation.inviter.firstName && invitation.inviter.lastName
        ? `${invitation.inviter.firstName} ${invitation.inviter.lastName}`
        : invitation.inviter.email;

    await this.emailService.sendCollaborationInvitation(
      invitation.email,
      invitation.email,
      inviterName,
      invitation.trip.title,
      invitation.trip.description || '',
      invitation.trip.startDate && invitation.trip.endDate
        ? `${typeof invitation.trip.startDate === 'string' ? invitation.trip.startDate : invitation.trip.startDate.toISOString().split('T')[0]} - ${typeof invitation.trip.endDate === 'string' ? invitation.trip.endDate : invitation.trip.endDate.toISOString().split('T')[0]}`
        : 'Date not set',
      invitation.role,
      invitationUrl,
      expiresAt.toISOString(),
      'en',
    );
  }

  /**
   * Get trip activity logs
   */
  async getTripActivityLogs(tripId: string): Promise<TripActivityLogEntity[]> {
    return this.activityLogRepository.find({
      where: { tripId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 50, // Limit to last 50 activities
    });
  }

  /**
   * Check if user has permission to manage trip
   */
  async checkPermission(
    tripId: string,
    userId: string,
    requiredRole: MemberRole,
  ): Promise<boolean> {
    const member = await this.memberRepository.findOne({
      where: { tripId, userId },
    });

    if (!member) {
      return false;
    }

    const roleHierarchy = {
      [MemberRole.VIEWER]: 0,
      [MemberRole.EDITOR]: 1,
      [MemberRole.OWNER]: 2,
    };

    return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
  }

  /**
   * Get user's role in a trip
   */
  async getUserRole(
    tripId: string,
    userId: string,
  ): Promise<MemberRole | null> {
    const member = await this.memberRepository.findOne({
      where: { tripId, userId },
    });

    return member?.role || null;
  }

  /**
   * Log activity
   */
  private async logActivity(
    tripId: string,
    userId: string,
    action: ActivityAction,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const log = this.activityLogRepository.create({
      tripId,
      userId,
      action,
      metadata,
    });

    await this.activityLogRepository.save(log);
  }
}
