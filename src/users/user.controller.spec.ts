import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRole, TravelStyle } from '../shared/types/base-response.types';

interface RequestWithUser extends Request {
  user: { id: string };
}

describe('UserController', () => {
  let userController: UserController;

  const mockUserProfileData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    passwordHash: '$2a$12$hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    preferences: null,
  };

  const mockUserService = {
    findById: jest.fn(),
    updateProfile: jest.fn(),
    transformToProfileData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    userController = module.get<UserController>(UserController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      // Arrange
      const mockRequest: RequestWithUser = {
        user: { id: '123e4567-e89b-12d3-a456-426614174000' },
      } as RequestWithUser;

      mockUserService.findById.mockResolvedValue(mockUser);
      mockUserService.transformToProfileData.mockReturnValue(
        mockUserProfileData,
      );

      // Act
      const actualResult = await userController.getProfile(mockRequest);

      // Assert
      expect(actualResult).toEqual({
        result: 'OK',
        status: HttpStatus.OK,
        data: mockUserProfileData,
      });
      expect(mockUserService.findById).toHaveBeenCalledWith(
        mockRequest.user.id,
      );
      expect(mockUserService.transformToProfileData).toHaveBeenCalledWith(
        mockUser,
      );
    });

    it('should return not found when user profile does not exist', async () => {
      // Arrange
      const mockRequest: RequestWithUser = {
        user: { id: 'nonexistent-id' },
      } as RequestWithUser;

      mockUserService.findById.mockResolvedValue(null);

      // Act
      const actualResult = await userController.getProfile(mockRequest);

      // Assert
      expect(actualResult).toEqual({
        result: 'NG',
        status: HttpStatus.NOT_FOUND,
        data: {
          message: 'User profile not found',
          code: 'NOT_FOUND',
        },
      });
      expect(mockUserService.findById).toHaveBeenCalledWith(
        mockRequest.user.id,
      );
    });
  });

  describe('updateProfile', () => {
    const inputUpdateUserDto = {
      firstName: 'Jane',
      lastName: 'Smith',
      preferences: {
        travelStyle: [TravelStyle.ADVENTURE, TravelStyle.CULTURAL],
        interests: ['hiking', 'photography'],
      },
    };

    it('should update user profile successfully', async () => {
      // Arrange
      const mockRequest: RequestWithUser = {
        user: { id: '123e4567-e89b-12d3-a456-426614174000' },
      } as RequestWithUser;

      const expectedUpdatedUser = {
        ...mockUser,
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const expectedUpdatedProfileData = {
        ...mockUserProfileData,
        firstName: 'Jane',
        lastName: 'Smith',
      };

      mockUserService.updateProfile.mockResolvedValue(expectedUpdatedUser);
      mockUserService.transformToProfileData.mockReturnValue(
        expectedUpdatedProfileData,
      );

      // Act
      const actualResult = await userController.updateProfile(
        mockRequest,
        inputUpdateUserDto,
      );

      // Assert
      expect(actualResult).toEqual({
        result: 'OK',
        status: HttpStatus.OK,
        data: expectedUpdatedProfileData,
      });
      expect(mockUserService.updateProfile).toHaveBeenCalledWith(
        mockRequest.user.id,
        inputUpdateUserDto,
      );
      expect(mockUserService.transformToProfileData).toHaveBeenCalledWith(
        expectedUpdatedUser,
      );
    });
  });

  describe('adminTest', () => {
    it('should return test message successfully', () => {
      // Act
      const actualResult = userController.adminTest();

      // Assert
      expect(actualResult.result).toBe('OK');
      expect(actualResult.status).toBe(HttpStatus.OK);
      expect(actualResult.data.message).toBe(
        'Users module is working correctly',
      );
      expect(actualResult.data.timestamp).toBeInstanceOf(Date);
    });
  });
});
