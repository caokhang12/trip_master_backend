import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserEntity } from '../schemas/user.entity';
import { UserPreferencesEntity } from '../schemas/user-preferences.entity';
import { UploadService } from '../upload/upload.service';
import { TravelStyle, UserRole } from '../shared/types/base-response.types';

describe('UserService', () => {
  let service: UserService;
  let _userRepository: Repository<UserEntity>;
  let _preferencesRepository: Repository<UserPreferencesEntity>;
  let _uploadService: UploadService;

  const mockUser: UserEntity = {
    id: 'test-user-id',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    provider: 'local',
    firstName: 'John',
    lastName: 'Doe',
    avatarUrl: 'https://example.com/avatar.jpg',
    preferredLanguage: 'en',
    preferredCurrency: 'USD',
    homeCountry: 'Vietnam',
    role: UserRole.USER,
    emailVerified: true,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    preferences: {
      userId: 'test-user-id',
      travelStyle: [TravelStyle.ADVENTURE, TravelStyle.CULTURAL],
      interests: ['hiking', 'photography'],
      dietaryRestrictions: ['vegetarian'],
      accessibilityNeeds: [],
      updatedAt: new Date(),
      user: null as any,
    },
    refreshTokens: [],
    isLocked: false,
    shouldLock: jest.fn(),
    resetFailedAttempts: jest.fn(),
    incrementFailedAttempts: jest.fn(),
    hasAvatar: true,
    getAvatarUrl: jest.fn(),
    displayName: 'John Doe',
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockPreferencesRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockUploadService = {
    uploadAvatar: jest.fn(),
    deleteFile: jest.fn(),
    extractPublicIdFromUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserPreferencesEntity),
          useValue: mockPreferencesRepository,
        },
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    _userRepository = module.get<Repository<UserEntity>>(
      getRepositoryToken(UserEntity),
    );
    _preferencesRepository = module.get<Repository<UserPreferencesEntity>>(
      getRepositoryToken(UserPreferencesEntity),
    );
    _uploadService = module.get<UploadService>(UploadService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('test-user-id');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        relations: ['preferences'],
      });
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update basic user information', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        preferredLanguage: 'vi',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        ...updateData,
      });

      const result = await service.updateProfile('test-user-id', updateData);

      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile('non-existent-id', { firstName: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update preferences when provided', async () => {
      const updateData = {
        firstName: 'Jane',
        preferences: {
          travelStyle: [TravelStyle.LUXURY],
          interests: ['art', 'cuisine'],
        },
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockPreferencesRepository.findOne.mockResolvedValue(mockUser.preferences);
      mockPreferencesRepository.save.mockResolvedValue({
        ...mockUser.preferences,
        ...updateData.preferences,
      });

      await service.updateProfile('test-user-id', updateData);

      expect(mockPreferencesRepository.save).toHaveBeenCalled();
    });
  });

  describe('transformToProfileData', () => {
    it('should transform user entity to profile data', () => {
      const result = service.transformToProfileData(mockUser);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        avatarUrl: mockUser.avatarUrl,
        hasAvatar: true,
        role: mockUser.role,
        emailVerified: mockUser.emailVerified,
        preferredLanguage: mockUser.preferredLanguage,
        preferredCurrency: mockUser.preferredCurrency,
        homeCountry: mockUser.homeCountry,
        preferences: {
          travelStyle: mockUser.preferences!.travelStyle,
          budgetRange: mockUser.preferences!.budgetRange,
          interests: mockUser.preferences!.interests,
          dietaryRestrictions: mockUser.preferences!.dietaryRestrictions,
          accessibilityNeeds: mockUser.preferences!.accessibilityNeeds,
        },
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should handle missing preferences gracefully', () => {
      const userWithoutPrefs: UserEntity = {
        ...mockUser,
        preferences: undefined,
        isLocked: false,
        shouldLock: jest.fn(),
        resetFailedAttempts: jest.fn(),
        incrementFailedAttempts: jest.fn(),
        hasAvatar: true,
        getAvatarUrl: jest.fn(),
        displayName: 'John Doe',
      };

      const result = service.transformToProfileData(userWithoutPrefs);

      expect(result.preferences).toBeUndefined();
    });

    it('should handle null preferences gracefully', () => {
      const userWithNullPrefs: UserEntity = {
        ...mockUser,
        preferences: null as any,
        isLocked: false,
        shouldLock: jest.fn(),
        resetFailedAttempts: jest.fn(),
        incrementFailedAttempts: jest.fn(),
        hasAvatar: true,
        getAvatarUrl: jest.fn(),
        displayName: 'John Doe',
      };

      const result = service.transformToProfileData(userWithNullPrefs);

      expect(result.preferences).toBeUndefined();
    });
  });

  describe('updateUserAvatar', () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'avatar.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('mock-image'),
    } as Express.Multer.File;

    it('should upload avatar and return updated profile', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUploadService.uploadAvatar.mockResolvedValue({
        secureUrl: 'https://example.com/new-avatar.jpg',
      });

      const result = await service.updateUserAvatar('test-user-id', mockFile);

      expect(mockUploadService.uploadAvatar).toHaveBeenCalledWith(
        'test-user-id',
        mockFile,
      );
      expect(result).toHaveProperty('avatarUrl');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateUserAvatar('non-existent-id', mockFile),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeUserAvatar', () => {
    it('should remove avatar and return updated profile', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUploadService.extractPublicIdFromUrl.mockReturnValue('avatar-id');
      mockUploadService.deleteFile.mockResolvedValue({ success: true });

      const result = await service.removeUserAvatar('test-user-id');

      expect(mockUploadService.deleteFile).toHaveBeenCalledWith(
        'test-user-id',
        'avatar-id',
      );
      expect(result).toBeDefined();
    });

    it('should handle user without avatar', async () => {
      const userWithoutAvatar = { ...mockUser, avatarUrl: null };
      mockUserRepository.findOne.mockResolvedValue(userWithoutAvatar);

      const result = await service.removeUserAvatar('test-user-id');

      expect(mockUploadService.deleteFile).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
