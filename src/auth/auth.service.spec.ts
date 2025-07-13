import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UserService } from '../users/user.service';
import { EmailService } from '../email/email.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { AuthTokenUtil } from './utils/auth-token.util';
import { UserEntity } from '../schemas/user.entity';
import { RefreshTokenEntity } from '../schemas/refresh-token.entity';
import { UserRole } from '../shared/types/base-response.types';

describe('AuthService', () => {
  let authService: AuthService;

  const mockUser: UserEntity = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    passwordHash: '$2a$12$hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    avatarUrl: undefined,
    homeCountry: undefined,
    role: UserRole.USER,
    emailVerified: true,
    emailVerificationToken: undefined,
    emailVerificationExpires: undefined,
    passwordResetToken: undefined,
    passwordResetExpires: undefined,
    failedLoginAttempts: 0,
    lockedUntil: undefined,
    lastLoginAt: undefined,
    lastLoginIp: undefined,
    refreshTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    preferences: undefined,
    // Computed properties
    get hasAvatar(): boolean {
      return false;
    },
    getAvatarUrl: jest.fn().mockReturnValue(null),
    get displayName(): string {
      return 'John Doe';
    },
    get isLocked(): boolean {
      return false;
    },
    shouldLock: jest.fn().mockReturnValue(false),
    resetFailedAttempts: jest.fn(),
    incrementFailedAttempts: jest.fn(),
  };

  const mockRefreshToken: RefreshTokenEntity = {
    id: 'token-id-123',
    token: 'refresh-token-hash',
    userId: mockUser.id,
    user: mockUser,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isActive: true,
    lastUsedAt: undefined,
    deviceInfo: {
      userAgent: 'test-agent',
      ip: '127.0.0.1',
    },
    createdAt: new Date(),
    get isValid(): boolean {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this.isActive && this.expiresAt > new Date();
    },
    get sanitizedDeviceInfo(): Partial<{
      userAgent?: string;
      ip?: string;
      deviceType?: 'web' | 'mobile' | 'tablet';
      deviceName?: string;
    }> {
      return {
        deviceType: this.deviceInfo?.deviceType as 'web' | 'mobile' | 'tablet',
        deviceName: this.deviceInfo?.deviceName,
      };
    },
  };

  const mockUserService = {
    createUser: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    verifyPassword: jest.fn(),
    updateUserSecurity: jest.fn(),
    updateUserFields: jest.fn(),
    setEmailVerificationToken: jest.fn(),
    verifyEmail: jest.fn(),
    verifyEmailAndGetUser: jest.fn(),
    setPasswordResetToken: jest.fn(),
    resetPassword: jest.fn(),
    transformToProfileData: jest.fn(),
  };

  const mockRefreshTokenService = {
    createRefreshToken: jest.fn(),
    findValidToken: jest.fn(),
    updateLastUsed: jest.fn(),
    revokeToken: jest.fn(),
    revokeAllUserTokens: jest.fn(),
    revokeOtherUserTokens: jest.fn(),
    cleanupExpiredTokens: jest.fn(),
    getUserActiveSessions: jest.fn(),
    getUserActiveSessionCount: jest.fn(),
    revokeSession: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    }),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: RefreshTokenService, useValue: mockRefreshTokenService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);

    // Initialize AuthTokenUtil with config service
    AuthTokenUtil.initialize(mockConfigService);

    // Mock static methods
    jest.spyOn(AuthTokenUtil, 'generateTokens').mockReturnValue({
      access_token: 'accessToken',
      refresh_token: 'refreshToken',
    });
    jest
      .spyOn(AuthTokenUtil, 'calculateRefreshTokenExpiry')
      .mockReturnValue(new Date());
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockEmailService.sendVerificationEmail.mockResolvedValue(true);
    mockEmailService.sendPasswordResetEmail.mockResolvedValue(true);
    mockEmailService.sendWelcomeEmail.mockResolvedValue(true);
  });

  describe('register', () => {
    const inputRegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
      // Arrange
      const expectedTokens = {
        access_token: 'accessToken',
        refresh_token: 'refreshToken',
      };
      const expectedProfileData = { id: mockUser.id, email: mockUser.email };

      mockUserService.createUser.mockResolvedValue(mockUser);
      mockUserService.setEmailVerificationToken.mockResolvedValue(undefined);
      mockRefreshTokenService.createRefreshToken.mockResolvedValue(
        mockRefreshToken,
      );
      mockUserService.transformToProfileData.mockReturnValue(
        expectedProfileData,
      );
      mockJwtService.sign
        .mockReturnValueOnce('accessToken')
        .mockReturnValueOnce('refreshToken');

      // Act
      const actualResult = await authService.register(inputRegisterDto);

      // Assert
      expect(actualResult).toEqual({
        ...expectedTokens,
        user_profile: expectedProfileData,
      });
      expect(mockUserService.createUser).toHaveBeenCalledWith(inputRegisterDto);
      expect(mockUserService.setEmailVerificationToken).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(String),
      );
      expect(mockRefreshTokenService.createRefreshToken).toHaveBeenCalledWith(
        mockUser,
        expectedTokens.refresh_token,
        expect.any(Date),
      );
    });

    it('should throw ConflictException when user already exists', async () => {
      // Arrange
      mockUserService.createUser.mockRejectedValue(
        new ConflictException('User with this email already exists'),
      );

      // Act & Assert
      await expect(authService.register(inputRegisterDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUserService.createUser).toHaveBeenCalledWith(inputRegisterDto);
    });
  });

  describe('login', () => {
    const inputLoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully with valid credentials', async () => {
      // Arrange
      const expectedTokens = {
        access_token: 'accessToken',
        refresh_token: 'refreshToken',
      };
      const expectedProfileData = { id: mockUser.id, email: mockUser.email };

      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockUserService.verifyPassword.mockResolvedValue(true);
      mockRefreshTokenService.createRefreshToken.mockResolvedValue(
        mockRefreshToken,
      );
      mockUserService.transformToProfileData.mockReturnValue(
        expectedProfileData,
      );
      mockJwtService.sign
        .mockReturnValueOnce('accessToken')
        .mockReturnValueOnce('refreshToken');

      // Act
      const actualResult = await authService.login(inputLoginDto);

      // Assert
      expect(actualResult).toEqual({
        ...expectedTokens,
        user_profile: expectedProfileData,
      });
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        inputLoginDto.email,
      );
      expect(mockUserService.verifyPassword).toHaveBeenCalledWith(
        mockUser,
        inputLoginDto.password,
      );
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      // Arrange
      mockUserService.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(inputLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        inputLoginDto.email,
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockUserService.verifyPassword.mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(inputLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserService.verifyPassword).toHaveBeenCalledWith(
        mockUser,
        inputLoginDto.password,
      );
    });
  });

  describe('refreshToken', () => {
    const inputRefreshToken = 'validRefreshToken';

    it('should refresh tokens successfully with valid refresh token', async () => {
      // Arrange
      const expectedTokens = {
        access_token: 'newAccessToken',
        refresh_token: 'newRefreshToken',
      };
      const expectedProfileData = { id: mockUser.id, email: mockUser.email };

      mockRefreshTokenService.findValidToken.mockResolvedValue(
        mockRefreshToken,
      );
      mockRefreshTokenService.revokeToken.mockResolvedValue(undefined);
      mockRefreshTokenService.createRefreshToken.mockResolvedValue(
        mockRefreshToken,
      );
      mockRefreshTokenService.updateLastUsed.mockResolvedValue(undefined);
      mockUserService.transformToProfileData.mockReturnValue(
        expectedProfileData,
      );

      // Mock generateTokens to return new tokens for refresh
      jest.spyOn(AuthTokenUtil, 'generateTokens').mockReturnValueOnce({
        access_token: 'newAccessToken',
        refresh_token: 'newRefreshToken',
      });

      // Act
      const actualResult = await authService.refreshToken(inputRefreshToken);

      // Assert
      expect(actualResult).toEqual({
        ...expectedTokens,
        user_profile: expectedProfileData,
      });
      expect(mockRefreshTokenService.findValidToken).toHaveBeenCalledWith(
        inputRefreshToken,
      );
      expect(mockRefreshTokenService.revokeToken).toHaveBeenCalledWith(
        inputRefreshToken,
      );
      expect(mockRefreshTokenService.createRefreshToken).toHaveBeenCalledWith(
        mockUser,
        expectedTokens.refresh_token,
        expect.any(Date),
        undefined,
      );
      expect(mockRefreshTokenService.updateLastUsed).toHaveBeenCalledWith(
        mockRefreshToken.id,
      );
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      // Arrange
      mockRefreshTokenService.findValidToken.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.refreshToken(inputRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockRefreshTokenService.findValidToken).toHaveBeenCalledWith(
        inputRefreshToken,
      );
    });
  });

  describe('verifyEmail', () => {
    const inputVerifyEmailDto = {
      token: 'validVerificationToken',
    };

    it('should verify email successfully with valid token', async () => {
      // Arrange
      const mockVerifiedUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        firstName: 'John',
        preferredLanguage: 'en',
      };
      mockUserService.verifyEmailAndGetUser.mockResolvedValue(mockVerifiedUser);

      // Act
      const actualResult = await authService.verifyEmail(inputVerifyEmailDto);

      // Assert
      expect(actualResult).toBe(true);
      expect(mockUserService.verifyEmailAndGetUser).toHaveBeenCalledWith(
        inputVerifyEmailDto.token,
      );
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        mockVerifiedUser.email,
        mockVerifiedUser.firstName,
        'en',
      );
    });

    it('should throw BadRequestException when token is invalid', async () => {
      // Arrange
      mockUserService.verifyEmailAndGetUser.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.verifyEmail(inputVerifyEmailDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('forgotPassword', () => {
    const inputForgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should send password reset email when user exists', async () => {
      // Arrange
      mockUserService.setPasswordResetToken.mockResolvedValue(true);

      // Act
      const actualResult = await authService.forgotPassword(
        inputForgotPasswordDto,
      );

      // Assert
      expect(actualResult).toBe(true);
      expect(mockUserService.setPasswordResetToken).toHaveBeenCalledWith(
        inputForgotPasswordDto.email,
        expect.any(String),
      );
    });

    it('should return true even when user does not exist (prevent email enumeration)', async () => {
      // Arrange
      mockUserService.setPasswordResetToken.mockResolvedValue(false);

      // Act
      const actualResult = await authService.forgotPassword(
        inputForgotPasswordDto,
      );

      // Assert
      expect(actualResult).toBe(true);
    });
  });

  describe('resetPassword', () => {
    const inputResetPasswordDto = {
      token: 'validResetToken',
      newPassword: 'newPassword123',
    };

    it('should reset password successfully with valid token', async () => {
      // Arrange
      mockUserService.resetPassword.mockResolvedValue(true);

      // Act
      const actualResult = await authService.resetPassword(
        inputResetPasswordDto,
      );

      // Assert
      expect(actualResult).toBe(true);
      expect(mockUserService.resetPassword).toHaveBeenCalledWith(
        inputResetPasswordDto.token,
        inputResetPasswordDto.newPassword,
      );
    });

    it('should throw BadRequestException when token is invalid', async () => {
      // Arrange
      mockUserService.resetPassword.mockResolvedValue(false);

      // Act & Assert
      await expect(
        authService.resetPassword(inputResetPasswordDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      // Arrange
      const inputUserId = mockUser.id;
      const inputRefreshToken = 'refresh-token';
      mockRefreshTokenService.revokeToken.mockResolvedValue(undefined);

      // Act
      const actualResult = await authService.logout(
        inputUserId,
        inputRefreshToken,
      );

      // Assert
      expect(actualResult).toBe(true);
      expect(mockRefreshTokenService.revokeToken).toHaveBeenCalledWith(
        inputRefreshToken,
      );
    });

    it('should logout all sessions when no specific token provided', async () => {
      // Arrange
      const inputUserId = mockUser.id;
      mockRefreshTokenService.revokeAllUserTokens.mockResolvedValue(undefined);

      // Act
      const actualResult = await authService.logout(inputUserId);

      // Assert
      expect(actualResult).toBe(true);
      expect(mockRefreshTokenService.revokeAllUserTokens).toHaveBeenCalledWith(
        inputUserId,
      );
    });
  });

  describe('logoutAll', () => {
    it('should logout all user sessions successfully', async () => {
      // Arrange
      const inputUserId = mockUser.id;
      mockRefreshTokenService.revokeAllUserTokens.mockResolvedValue(undefined);

      // Act
      const actualResult = await authService.logoutAll(inputUserId);

      // Assert
      expect(actualResult).toBe(true);
      expect(mockRefreshTokenService.revokeAllUserTokens).toHaveBeenCalledWith(
        inputUserId,
      );
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions successfully', async () => {
      // Arrange
      const inputUserId = mockUser.id;
      const mockSessions = [mockRefreshToken];
      mockRefreshTokenService.getUserActiveSessions.mockResolvedValue(
        mockSessions,
      );

      // Act
      const actualResult = await authService.getActiveSessions(inputUserId);

      // Assert
      expect(actualResult).toEqual([
        {
          id: mockRefreshToken.id,
          createdAt: mockRefreshToken.createdAt,
          lastUsedAt: mockRefreshToken.lastUsedAt,
          expiresAt: mockRefreshToken.expiresAt,
          isCurrent: false,
          deviceInfo: mockRefreshToken.sanitizedDeviceInfo,
        },
      ]);
      expect(
        mockRefreshTokenService.getUserActiveSessions,
      ).toHaveBeenCalledWith(inputUserId);
    });
  });

  describe('revokeSession', () => {
    it('should revoke session successfully', async () => {
      // Arrange
      const inputUserId = mockUser.id;
      const inputSessionId = 'session-id';
      mockRefreshTokenService.revokeSession.mockResolvedValue(true);

      // Act
      const actualResult = await authService.revokeSession(
        inputUserId,
        inputSessionId,
      );

      // Assert
      expect(actualResult).toBe(true);
      expect(mockRefreshTokenService.revokeSession).toHaveBeenCalledWith(
        inputUserId,
        inputSessionId,
      );
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should cleanup expired tokens successfully', async () => {
      // Arrange
      const expectedCount = 5;
      mockRefreshTokenService.cleanupExpiredTokens.mockResolvedValue(
        expectedCount,
      );

      // Act
      const actualResult = await authService.cleanupExpiredTokens();

      // Assert
      expect(actualResult).toBe(expectedCount);
      expect(mockRefreshTokenService.cleanupExpiredTokens).toHaveBeenCalled();
    });
  });
});
