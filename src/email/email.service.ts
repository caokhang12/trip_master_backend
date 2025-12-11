import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Professional email service for TripMaster application
 * Provides multilingual support and comprehensive error handling
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Send email verification for account activation
   * @param email - User email address
   * @param token - Verification token
   * @param firstName - User first name
   * @param language - Email language preference (en | vi)
   * @returns Success status
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    firstName?: string,
    language: 'en' | 'vi' = 'en',
  ): Promise<boolean> {
    try {
      const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
      const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

      const subjects = {
        en: 'Verify your TripMaster account',
        vi: 'Xác minh tài khoản TripMaster của bạn',
      };

      await this.mailerService.sendMail({
        to: email,
        subject: subjects[language],
        template: './verification',
        context: {
          firstName: firstName || 'User',
          verificationUrl,
          language,
          isVietnamese: language === 'vi',
        },
      });

      this.logger.log(`Verification email sent successfully to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Send password reset email with secure token
   * @param email - User email address
   * @param token - Password reset token
   * @param firstName - User first name
   * @param language - Email language preference (en | vi)
   * @returns Success status
   */
  async sendPasswordResetEmail(
    email: string,
    token: string,
    firstName?: string,
    language: 'en' | 'vi' = 'en',
  ): Promise<boolean> {
    try {
      const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
      const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

      const subjects = {
        en: 'Reset your TripMaster password',
        vi: 'Đặt lại mật khẩu TripMaster của bạn',
      };

      await this.mailerService.sendMail({
        to: email,
        subject: subjects[language],
        template: './password-reset',
        context: {
          firstName: firstName || 'User',
          resetUrl,
          language,
          isVietnamese: language === 'vi',
        },
      });

      this.logger.log(`Password reset email sent successfully to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Send welcome email after successful account verification
   * @param email - User email address
   * @param firstName - User first name
   * @param language - Email language preference (en | vi)
   * @returns Success status
   */
  async sendWelcomeEmail(
    email: string,
    firstName?: string,
    language: 'en' | 'vi' = 'en',
  ): Promise<boolean> {
    try {
      const subjects = {
        en: 'Welcome to TripMaster!',
        vi: 'Chào mừng đến với TripMaster!',
      };

      await this.mailerService.sendMail({
        to: email,
        subject: subjects[language],
        template: './welcome',
        context: {
          firstName: firstName || 'User',
          language,
          isVietnamese: language === 'vi',
          frontendUrl: this.configService.getOrThrow<string>('FRONTEND_URL'),
        },
      });

      this.logger.log(`Welcome email sent successfully to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
      return false;
    }
  }

  /**
   * Send trip sharing notification email
   * @param email - Recipient email address
   * @param senderName - Name of user sharing the trip
   * @param tripTitle - Title of shared trip
   * @param shareUrl - URL to view shared trip
   * @param language - Email language preference (en | vi)
   * @returns Success status
   */
  async sendTripSharingEmail(
    email: string,
    senderName: string,
    tripTitle: string,
    shareUrl: string,
    language: 'en' | 'vi' = 'en',
  ): Promise<boolean> {
    try {
      const subjects = {
        en: `${senderName} shared a trip with you`,
        vi: `${senderName} đã chia sẻ một chuyến đi với bạn`,
      };

      await this.mailerService.sendMail({
        to: email,
        subject: subjects[language],
        template: './trip-sharing',
        context: {
          senderName,
          tripTitle,
          shareUrl,
          language,
          isVietnamese: language === 'vi',
        },
      });

      this.logger.log(`Trip sharing email sent successfully to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send trip sharing email to ${email}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Send collaboration invitation email
   * @param email - Recipient email address
   * @param recipientName - Name of the person being invited
   * @param inviterName - Name of the person sending the invitation
   * @param tripTitle - Title of the trip
   * @param tripDescription - Optional trip description
   * @param tripDates - Optional trip dates as formatted string
   * @param role - Role being assigned (owner | editor | viewer)
   * @param invitationUrl - URL to accept the invitation
   * @param expiresAt - Optional expiration date as formatted string
   * @param language - Email language preference (en | vi)
   * @returns Success status
   */
  async sendCollaborationInvitation(
    email: string,
    recipientName: string,
    inviterName: string,
    tripTitle: string,
    tripDescription: string | undefined,
    tripDates: string | undefined,
    role: 'owner' | 'editor' | 'viewer',
    invitationUrl: string,
    expiresAt: string | undefined,
    language: 'en' | 'vi' = 'en',
  ): Promise<boolean> {
    try {
      const subjects = {
        en: `${inviterName} invited you to collaborate on a trip`,
        vi: `${inviterName} đã mời bạn cộng tác trên một chuyến đi`,
      };

      await this.mailerService.sendMail({
        to: email,
        subject: subjects[language],
        template: './invitation',
        context: {
          recipientName,
          inviterName,
          tripTitle,
          tripDescription,
          tripDates,
          role,
          invitationUrl,
          expiresAt,
          language,
          isVietnamese: language === 'vi',
        },
      });

      this.logger.log(
        `Collaboration invitation sent successfully to ${email} for role ${role}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send collaboration invitation to ${email}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Send notification when a new member joins a trip
   * @param email - Trip owner's email address
   * @param ownerName - Name of the trip owner
   * @param newMemberName - Name of the new member
   * @param newMemberEmail - Email of the new member
   * @param tripTitle - Title of the trip
   * @param role - Role assigned to the new member
   * @param tripUrl - URL to view the trip
   * @param language - Email language preference (en | vi)
   * @returns Success status
   */
  async sendMemberAdded(
    email: string,
    ownerName: string,
    newMemberName: string,
    newMemberEmail: string,
    tripTitle: string,
    role: 'owner' | 'editor' | 'viewer',
    tripUrl: string,
    language: 'en' | 'vi' = 'en',
  ): Promise<boolean> {
    try {
      const subjects = {
        en: `New member joined your trip: ${tripTitle}`,
        vi: `Thành viên mới đã tham gia chuyến đi: ${tripTitle}`,
      };

      await this.mailerService.sendMail({
        to: email,
        subject: subjects[language],
        template: './member-added',
        context: {
          ownerName,
          newMemberName,
          newMemberEmail,
          tripTitle,
          role,
          tripUrl,
          language,
          isVietnamese: language === 'vi',
        },
      });

      this.logger.log(
        `Member added notification sent successfully to ${email}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send member added notification to ${email}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Send notification when a member is removed from a trip
   * @param email - Removed member's email address
   * @param memberName - Name of the removed member
   * @param removerName - Name of the person who removed the member
   * @param tripTitle - Title of the trip
   * @param language - Email language preference (en | vi)
   * @returns Success status
   */
  async sendMemberRemoved(
    email: string,
    memberName: string,
    removerName: string,
    tripTitle: string,
    language: 'en' | 'vi' = 'en',
  ): Promise<boolean> {
    try {
      const subjects = {
        en: `You were removed from trip: ${tripTitle}`,
        vi: `Bạn đã bị xóa khỏi chuyến đi: ${tripTitle}`,
      };

      await this.mailerService.sendMail({
        to: email,
        subject: subjects[language],
        template: './member-removed',
        context: {
          memberName,
          removerName,
          tripTitle,
          language,
          isVietnamese: language === 'vi',
        },
      });

      this.logger.log(
        `Member removed notification sent successfully to ${email}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send member removed notification to ${email}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Send notification when a member's permission is changed
   * @param email - Member's email address
   * @param memberName - Name of the member
   * @param changerName - Name of the person who changed the permission
   * @param tripTitle - Title of the trip
   * @param oldRole - Previous role
   * @param newRole - New role
   * @param tripUrl - URL to view the trip
   * @param language - Email language preference (en | vi)
   * @returns Success status
   */
  async sendPermissionChanged(
    email: string,
    memberName: string,
    changerName: string,
    tripTitle: string,
    oldRole: 'owner' | 'editor' | 'viewer',
    newRole: 'owner' | 'editor' | 'viewer',
    tripUrl: string,
    language: 'en' | 'vi' = 'en',
  ): Promise<boolean> {
    try {
      const subjects = {
        en: `Your permission changed in trip: ${tripTitle}`,
        vi: `Quyền của bạn đã thay đổi trong chuyến đi: ${tripTitle}`,
      };

      await this.mailerService.sendMail({
        to: email,
        subject: subjects[language],
        template: './permission-changed',
        context: {
          memberName,
          changerName,
          tripTitle,
          oldRole,
          newRole,
          tripUrl,
          language,
          isVietnamese: language === 'vi',
        },
      });

      this.logger.log(
        `Permission changed notification sent successfully to ${email}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send permission changed notification to ${email}:`,
        error,
      );
      return false;
    }
  }
}
