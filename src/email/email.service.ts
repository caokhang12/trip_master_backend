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
}
