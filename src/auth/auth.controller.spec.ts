import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from '../shared/types/base-response.types';

interface RequestWithUser extends Request {
  user: { id: string };
}

describe('AuthController', () => {
  let authController: AuthController;

  const mockAuthResponseData = {
    access_token: 'accessToken',
    refresh_token: 'refreshToken',
    user_profile: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.USER,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    socialLogin: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerification: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    authController = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const inputRegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register user successfully', async () => {
      // Arrange
      mockAuthService.register.mockResolvedValue(mockAuthResponseData);

      // Act
      const actualResult = await authController.register(inputRegisterDto);

      // Assert
      expect(actualResult).toEqual({
        result: 'OK',
        status: HttpStatus.CREATED,
        data: mockAuthResponseData,
      });
      expect(mockAuthService.register).toHaveBeenCalledWith(inputRegisterDto);
    });
  });

  describe('login', () => {
    const inputLoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockAuthResponseData);

      // Act
      const actualResult = await authController.login(inputLoginDto);

      // Assert
      expect(actualResult).toEqual({
        result: 'OK',
        status: HttpStatus.OK,
        data: mockAuthResponseData,
      });
      expect(mockAuthService.login).toHaveBeenCalledWith(inputLoginDto);
    });
  });

  describe('refreshToken', () => {
    const inputRefreshTokenDto = {
      refreshToken: 'validRefreshToken',
    };

    it('should refresh token successfully', async () => {
      // Arrange
      mockAuthService.refreshToken.mockResolvedValue(mockAuthResponseData);

      // Act
      const actualResult =
        await authController.refreshToken(inputRefreshTokenDto);

      // Assert
      expect(actualResult).toEqual({
        result: 'OK',
        status: HttpStatus.OK,
        data: mockAuthResponseData,
      });
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        inputRefreshTokenDto,
      );
    });
  });

  describe('verifyEmail', () => {
    const inputVerifyEmailDto = {
      token: 'validVerificationToken',
    };

    it('should verify email successfully', async () => {
      // Arrange
      mockAuthService.verifyEmail.mockResolvedValue(true);

      // Act
      const actualResult =
        await authController.verifyEmail(inputVerifyEmailDto);

      // Assert
      expect(actualResult).toEqual({
        result: 'OK',
        status: HttpStatus.OK,
        data: { verified: true },
      });
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith(
        inputVerifyEmailDto,
      );
    });
  });

  describe('forgotPassword', () => {
    const inputForgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should send forgot password email successfully', async () => {
      // Arrange
      mockAuthService.forgotPassword.mockResolvedValue(true);

      // Act
      const actualResult = await authController.forgotPassword(
        inputForgotPasswordDto,
      );

      // Assert
      expect(actualResult).toEqual({
        result: 'OK',
        status: HttpStatus.OK,
        data: { sent: true },
      });
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(
        inputForgotPasswordDto,
      );
    });
  });

  describe('resetPassword', () => {
    const inputResetPasswordDto = {
      token: 'validResetToken',
      newPassword: 'newPassword123',
    };

    it('should reset password successfully', async () => {
      // Arrange
      mockAuthService.resetPassword.mockResolvedValue(true);

      // Act
      const actualResult = await authController.resetPassword(
        inputResetPasswordDto,
      );

      // Assert
      expect(actualResult).toEqual({
        result: 'OK',
        status: HttpStatus.OK,
        data: { reset: true },
      });
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        inputResetPasswordDto,
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      // Arrange
      const mockRequest = {
        user: { id: '123e4567-e89b-12d3-a456-426614174000' },
      } as RequestWithUser;
      mockAuthService.logout.mockResolvedValue(true);

      // Act
      const actualResult = await authController.logout(mockRequest);

      // Assert
      expect(actualResult).toEqual({
        result: 'OK',
        status: HttpStatus.OK,
        data: { logout: true },
      });
      expect(mockAuthService.logout).toHaveBeenCalledWith(mockRequest.user.id);
    });
  });

  describe('adminTest', () => {
    it('should return test message successfully', () => {
      // Act
      const actualResult = authController.adminTest();

      // Assert
      expect(actualResult.result).toBe('OK');
      expect(actualResult.status).toBe(HttpStatus.OK);
      expect(actualResult.data.message).toBe(
        'Auth module is working correctly',
      );
      expect(actualResult.data.timestamp).toBeInstanceOf(Date);
    });
  });
});
