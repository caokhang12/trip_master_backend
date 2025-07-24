import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { CloudinaryService } from './services/cloudinary.service';
import { UserEntity } from '../schemas/user.entity';
import { TripEntity } from '../schemas/trip.entity';
import { FileValidationUtil } from '../upload/utils/file-validation.util';

describe('UploadService', () => {
  let service: UploadService;

  const mockUserRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockTripRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockCloudinaryService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    extractPublicId: jest.fn(),
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('test'),
    stream: {} as any,
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(TripEntity),
          useValue: mockTripRepository,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should validate file correctly', () => {
      expect(() =>
        FileValidationUtil.validateSingleFile(mockFile),
      ).not.toThrow();
    });

    it('should reject invalid file types', () => {
      const invalidFile = { ...mockFile, mimetype: 'text/plain' };
      expect(() => FileValidationUtil.validateSingleFile(invalidFile)).toThrow(
        BadRequestException,
      );
    });

    it('should reject files that are too large', () => {
      const largeFile = { ...mockFile, size: 10 * 1024 * 1024 }; // 10MB
      expect(() => FileValidationUtil.validateSingleFile(largeFile)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('uploadAvatar', () => {
    it('should throw NotFoundException if user not found', async () => {
      const userId = 'user-123';
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.uploadAvatar(userId, mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should upload avatar successfully', async () => {
      const userId = 'user-123';
      const mockUser = { id: userId, avatarUrl: null };
      const expectedResult = {
        publicId: 'tripmaster/avatars/test',
        url: 'http://cloudinary.com/image.jpg',
        secureUrl: 'https://cloudinary.com/image.jpg',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockCloudinaryService.uploadFile.mockResolvedValue(expectedResult);

      const result = await service.uploadAvatar(userId, mockFile);

      expect(result).toEqual(expectedResult);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        avatarUrl: expectedResult.secureUrl,
      });
    });
  });

  describe('uploadTripImages', () => {
    it('should throw BadRequestException if no files provided', async () => {
      const userId = 'user-123';
      const tripId = 'trip-456';

      await expect(
        service.uploadTripImages(userId, tripId, []),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if trip not found', async () => {
      const userId = 'user-123';
      const tripId = 'trip-456';
      mockTripRepository.findOne.mockResolvedValue(null);

      await expect(
        service.uploadTripImages(userId, tripId, [mockFile]),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
