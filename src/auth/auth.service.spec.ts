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
import { AuthTokenUtil } from './utils/auth-token.util';
import { UserEntity } from '../schemas/user.entity';
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
    emailVerified: false,
    emailVerificationToken: undefined,
    emailVerificationExpires: undefined,
    passwordResetToken: undefined,
    passwordResetExpires: undefined,
    refreshToken: 'mockRefreshToken',
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
  };

  const mockUserService = {
    createUser: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    verifyPassword: jest.fn(),
    updateRefreshToken: jest.fn(),
    setEmailVerificationToken: jest.fn(),
    verifyEmail: jest.fn(),
    verifyEmailAndGetUser: jest.fn(),
    setPasswordResetToken: jest.fn(),
    resetPassword: jest.fn(),
    transformToProfileData: jest.fn(),
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
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);

    // Initialize AuthTokenUtil with config service
    AuthTokenUtil.initialize(mockConfigService);
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
      mockUserService.updateRefreshToken.mockResolvedValue(undefined);
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
      expect(mockUserService.updateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        expectedTokens.refresh_token,
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
      mockUserService.updateRefreshToken.mockResolvedValue(undefined);
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
    const inputRefreshTokenDto = {
      refreshToken: 'validRefreshToken',
    };

    it('should refresh tokens successfully with valid refresh token', async () => {
      // Arrange
      const mockPayload = { sub: mockUser.id, email: mockUser.email };
      const expectedTokens = {
        access_token: 'newAccessToken',
        refresh_token: 'newRefreshToken',
      };
      const expectedProfileData = { id: mockUser.id, email: mockUser.email };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserService.findById.mockResolvedValue({
        ...mockUser,
        refreshToken: inputRefreshTokenDto.refreshToken,
      });
      mockUserService.updateRefreshToken.mockResolvedValue(undefined);
      mockUserService.transformToProfileData.mockReturnValue(
        expectedProfileData,
      );
      mockJwtService.sign
        .mockReturnValueOnce('newAccessToken')
        .mockReturnValueOnce('newRefreshToken');

      // Act
      const actualResult = await authService.refreshToken(inputRefreshTokenDto);

      // Assert
      expect(actualResult).toEqual({
        ...expectedTokens,
        user_profile: expectedProfileData,
      });
      expect(mockJwtService.verify).toHaveBeenCalledWith(
        inputRefreshTokenDto.refreshToken,
        { secret: 'refresh-secret' },
      );
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      // Arrange
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(
        authService.refreshToken(inputRefreshTokenDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      const mockPayload = { sub: 'invalidUserId', email: 'test@example.com' };
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserService.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.refreshToken(inputRefreshTokenDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when refresh token does not match', async () => {
      // Arrange
      const mockPayload = { sub: mockUser.id, email: mockUser.email };
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserService.findById.mockResolvedValue({
        ...mockUser,
        refreshToken: 'differentRefreshToken',
      });

      // Act & Assert
      await expect(
        authService.refreshToken(inputRefreshTokenDto),
      ).rejects.toThrow(UnauthorizedException);
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
      mockUserService.updateRefreshToken.mockResolvedValue(undefined);

      // Act
      const actualResult = await authService.logout(inputUserId);

      // Assert
      expect(actualResult).toBe(true);
      expect(mockUserService.updateRefreshToken).toHaveBeenCalledWith(
        inputUserId,
        null,
      );
    });
  });
});
