import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let mailerService: MailerService;
  let configService: ConfigService;

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        FRONTEND_URL: 'http://localhost:3001',
        MAIL_FROM: 'noreply@tripmaster.com',
      };
      return config[key] || 'default-value';
    }),
    getOrThrow: jest.fn((key: string) => {
      const config = {
        FRONTEND_URL: 'http://localhost:3001',
        MAIL_FROM: 'noreply@tripmaster.com',
      };
      return config[key] || 'default-value';
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    mailerService = module.get<MailerService>(MailerService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerificationEmail', () => {
    const inputData = {
      email: 'test@example.com',
      token: 'token123',
      firstName: 'John',
      language: 'en' as const,
    };

    it('should send verification email successfully', async () => {
      // Arrange
      mockMailerService.sendMail.mockResolvedValue(true);

      // Act
      const actualResult = await service.sendVerificationEmail(
        inputData.email,
        inputData.token,
        inputData.firstName,
        inputData.language,
      );

      // Assert
      expect(actualResult).toBe(true);
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: inputData.email,
        subject: 'Verify your TripMaster account',
        template: './verification',
        context: {
          firstName: inputData.firstName,
          verificationUrl: `http://localhost:3001/verify-email?token=${inputData.token}`,
          language: inputData.language,
          isVietnamese: false,
        },
      });
    });

    it('should send Vietnamese verification email', async () => {
      // Arrange
      mockMailerService.sendMail.mockResolvedValue(true);

      // Act
      const actualResult = await service.sendVerificationEmail(
        inputData.email,
        inputData.token,
        inputData.firstName,
        'vi',
      );

      // Assert
      expect(actualResult).toBe(true);
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: inputData.email,
        subject: 'Xác minh tài khoản TripMaster của bạn',
        template: './verification',
        context: {
          firstName: inputData.firstName,
          verificationUrl: `http://localhost:3001/verify-email?token=${inputData.token}`,
          language: 'vi',
          isVietnamese: true,
        },
      });
    });

    it('should handle email sending failure gracefully', async () => {
      // Arrange
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP Error'));

      // Act
      const actualResult = await service.sendVerificationEmail(
        inputData.email,
        inputData.token,
        inputData.firstName,
        inputData.language,
      );

      // Assert
      expect(actualResult).toBe(false);
    });

    it('should use default values for optional parameters', async () => {
      // Arrange
      mockMailerService.sendMail.mockResolvedValue(true);

      // Act
      const actualResult = await service.sendVerificationEmail(
        inputData.email,
        inputData.token,
      );

      // Assert
      expect(actualResult).toBe(true);
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: inputData.email,
        subject: 'Verify your TripMaster account',
        template: './verification',
        context: {
          firstName: 'User',
          verificationUrl: `http://localhost:3001/verify-email?token=${inputData.token}`,
          language: 'en',
          isVietnamese: false,
        },
      });
    });
  });

  describe('sendPasswordResetEmail', () => {
    const inputData = {
      email: 'test@example.com',
      token: 'resetToken123',
      firstName: 'John',
      language: 'en' as const,
    };

    it('should send password reset email successfully', async () => {
      // Arrange
      mockMailerService.sendMail.mockResolvedValue(true);

      // Act
      const actualResult = await service.sendPasswordResetEmail(
        inputData.email,
        inputData.token,
        inputData.firstName,
        inputData.language,
      );

      // Assert
      expect(actualResult).toBe(true);
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: inputData.email,
        subject: 'Reset your TripMaster password',
        template: './password-reset',
        context: {
          firstName: inputData.firstName,
          resetUrl: `http://localhost:3001/auth/reset-password?token=${inputData.token}`,
          language: inputData.language,
          isVietnamese: false,
        },
      });
    });

    it('should send Vietnamese password reset email', async () => {
      // Arrange
      mockMailerService.sendMail.mockResolvedValue(true);

      // Act
      const actualResult = await service.sendPasswordResetEmail(
        inputData.email,
        inputData.token,
        inputData.firstName,
        'vi',
      );

      // Assert
      expect(actualResult).toBe(true);
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: inputData.email,
        subject: 'Đặt lại mật khẩu TripMaster của bạn',
        template: './password-reset',
        context: {
          firstName: inputData.firstName,
          resetUrl: `http://localhost:3001/auth/reset-password?token=${inputData.token}`,
          language: 'vi',
          isVietnamese: true,
        },
      });
    });

    it('should handle email sending failure gracefully', async () => {
      // Arrange
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP Error'));

      // Act
      const actualResult = await service.sendPasswordResetEmail(
        inputData.email,
        inputData.token,
        inputData.firstName,
        inputData.language,
      );

      // Assert
      expect(actualResult).toBe(false);
    });
  });

  describe('sendWelcomeEmail', () => {
    const inputData = {
      email: 'test@example.com',
      firstName: 'John',
      language: 'en' as const,
    };

    it('should send welcome email successfully', async () => {
      // Arrange
      mockMailerService.sendMail.mockResolvedValue(true);

      // Act
      const actualResult = await service.sendWelcomeEmail(
        inputData.email,
        inputData.firstName,
        inputData.language,
      );

      // Assert
      expect(actualResult).toBe(true);
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: inputData.email,
        subject: 'Welcome to TripMaster!',
        template: './welcome',
        context: {
          firstName: inputData.firstName,
          language: inputData.language,
          isVietnamese: false,
          frontendUrl: 'http://localhost:3001',
        },
      });
    });

    it('should send Vietnamese welcome email', async () => {
      // Arrange
      mockMailerService.sendMail.mockResolvedValue(true);

      // Act
      const actualResult = await service.sendWelcomeEmail(
        inputData.email,
        inputData.firstName,
        'vi',
      );

      // Assert
      expect(actualResult).toBe(true);
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: inputData.email,
        subject: 'Chào mừng đến với TripMaster!',
        template: './welcome',
        context: {
          firstName: inputData.firstName,
          language: 'vi',
          isVietnamese: true,
          frontendUrl: 'http://localhost:3001',
        },
      });
    });

    it('should handle email sending failure gracefully', async () => {
      // Arrange
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP Error'));

      // Act
      const actualResult = await service.sendWelcomeEmail(
        inputData.email,
        inputData.firstName,
        inputData.language,
      );

      // Assert
      expect(actualResult).toBe(false);
    });
  });

  describe('sendTripSharingEmail', () => {
    const inputData = {
      email: 'test@example.com',
      senderName: 'Jane Doe',
      tripTitle: 'Amazing Vietnam Trip',
      shareUrl: 'http://localhost:3001/trips/shared/abc123',
      language: 'en' as const,
    };

    it('should send trip sharing email successfully', async () => {
      // Arrange
      mockMailerService.sendMail.mockResolvedValue(true);

      // Act
      const actualResult = await service.sendTripSharingEmail(
        inputData.email,
        inputData.senderName,
        inputData.tripTitle,
        inputData.shareUrl,
        inputData.language,
      );

      // Assert
      expect(actualResult).toBe(true);
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: inputData.email,
        subject: `${inputData.senderName} shared a trip with you`,
        template: './trip-sharing',
        context: {
          senderName: inputData.senderName,
          tripTitle: inputData.tripTitle,
          shareUrl: inputData.shareUrl,
          language: inputData.language,
          isVietnamese: false,
        },
      });
    });

    it('should send Vietnamese trip sharing email', async () => {
      // Arrange
      mockMailerService.sendMail.mockResolvedValue(true);

      // Act
      const actualResult = await service.sendTripSharingEmail(
        inputData.email,
        inputData.senderName,
        inputData.tripTitle,
        inputData.shareUrl,
        'vi',
      );

      // Assert
      expect(actualResult).toBe(true);
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: inputData.email,
        subject: `${inputData.senderName} đã chia sẻ một chuyến đi với bạn`,
        template: './trip-sharing',
        context: {
          senderName: inputData.senderName,
          tripTitle: inputData.tripTitle,
          shareUrl: inputData.shareUrl,
          language: 'vi',
          isVietnamese: true,
        },
      });
    });
  });
});
