import { Test, TestingModule } from '@nestjs/testing';
import { TripImageService } from './trip-image.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TripEntity } from '../../schemas/trip.entity';
import { TripImageEntity } from '../../schemas/trip-image.entity';
import { TripImageRepository } from './trip-image.repository';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from '../../upload/services/cloudinary.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockTripRepo = () => ({ findOne: jest.fn() });
const mockImageRepo = () => ({});
const mockImageRepository = () => ({
  findByTrip: jest.fn(),
  mapByPublicId: jest.fn(),
  insertImages: jest.fn(),
  setThumbnail: jest.fn(),
  reorder: jest.fn(),
  deleteByPublicIds: jest.fn(),
});

const mockConfig = () => ({ get: jest.fn(() => '') });
const mockCloudinary = () => ({ deleteFile: jest.fn() });

describe('TripImageService', () => {
  let service: TripImageService;
  let tripRepo: any;
  let imageRepository: any;

  const userId = 'user-1';
  const tripId = 'trip-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripImageService,
        { provide: getRepositoryToken(TripEntity), useFactory: mockTripRepo },
        {
          provide: getRepositoryToken(TripImageEntity),
          useFactory: mockImageRepo,
        },
        { provide: TripImageRepository, useFactory: mockImageRepository },
        { provide: ConfigService, useFactory: mockConfig },
        { provide: CloudinaryService, useFactory: mockCloudinary },
      ],
    }).compile();

    service = module.get(TripImageService);
    tripRepo = module.get(getRepositoryToken(TripEntity));
    imageRepository = module.get(TripImageRepository);

    tripRepo.findOne.mockResolvedValue({ id: tripId, userId });
  });

  describe('sign', () => {
    it('returns upload slots with limit respected', async () => {
      imageRepository.findByTrip.mockResolvedValue([]);
      const result = await service.sign(userId, tripId, { count: 2 });
      expect(result.uploadSlots).toHaveLength(2);
      expect(result.maxPerTrip).toBe(20);
    });

    it('throws when limit reached', async () => {
      imageRepository.findByTrip.mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({ id: i })),
      );
      await expect(
        service.sign(userId, tripId, { count: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('confirm', () => {
    it('inserts new images and sets default thumbnail', async () => {
      imageRepository.mapByPublicId.mockResolvedValue(new Map());
      imageRepository.insertImages.mockResolvedValue(undefined);
      imageRepository.setThumbnail.mockResolvedValue(undefined);
      imageRepository.findByTrip.mockResolvedValue([
        {
          publicId: 'tripmaster/trips/trip-1/a',
          url: 'http://x/a.jpg',
          orderIndex: 0,
          isThumbnail: true,
        },
      ]);
      const dto = {
        images: [
          { publicId: 'tripmaster/trips/trip-1/a', url: 'http://x/a.jpg' },
        ],
      } as any;
      const gallery = await service.confirm(userId, tripId, dto);
      expect(gallery.images).toHaveLength(1);
      expect(imageRepository.insertImages).toHaveBeenCalledTimes(1);
    });
  });

  describe('reorder', () => {
    it('reorders when ids valid', async () => {
      imageRepository.findByTrip.mockResolvedValue([
        { publicId: 'p1', orderIndex: 0 },
        { publicId: 'p2', orderIndex: 1 },
      ]);
      imageRepository.reorder.mockResolvedValue(undefined);
      const dto = { order: ['p2', 'p1'] } as any;
      imageRepository.findByTrip.mockResolvedValue([
        { publicId: 'p2', orderIndex: 0, isThumbnail: false, url: 'u2' },
        { publicId: 'p1', orderIndex: 1, isThumbnail: true, url: 'u1' },
      ]);
      const gallery = await service.reorder(userId, tripId, dto);
      expect(gallery.images[0].publicId).toBe('p2');
    });

    it('errors when mismatch length', async () => {
      imageRepository.findByTrip.mockResolvedValue([
        { publicId: 'p1', orderIndex: 0 },
      ]);
      await expect(
        service.reorder(userId, tripId, { order: [] } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('setThumbnail', () => {
    it('sets thumbnail if exists', async () => {
      imageRepository.mapByPublicId.mockResolvedValue(
        new Map([['p1', { publicId: 'p1' }]]),
      );
      imageRepository.setThumbnail.mockResolvedValue(undefined);
      imageRepository.findByTrip.mockResolvedValue([
        { publicId: 'p1', url: 'u', orderIndex: 0, isThumbnail: true },
      ]);
      const gallery = await service.setThumbnail(userId, tripId, {
        publicId: 'p1',
      } as any);
      expect(gallery.thumbnail).not.toBeNull();
    });

    it('throws when image absent', async () => {
      imageRepository.mapByPublicId.mockResolvedValue(new Map());
      await expect(
        service.setThumbnail(userId, tripId, { publicId: 'x' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('diff', () => {
    it('removes extra images and preserves thumbnail', async () => {
      imageRepository.findByTrip
        .mockResolvedValueOnce([
          { publicId: 'keep', orderIndex: 0, isThumbnail: true, url: 'u1' },
          { publicId: 'remove', orderIndex: 1, isThumbnail: false, url: 'u2' },
        ])
        .mockResolvedValueOnce([
          { publicId: 'keep', orderIndex: 0, isThumbnail: true, url: 'u1' },
        ]);
      imageRepository.deleteByPublicIds.mockResolvedValue(undefined);
      const gallery = await service.diff(userId, tripId, {
        keep: ['keep'],
      } as any);
      expect(gallery.images).toHaveLength(1);
    });
  });

  describe('deleteSingle', () => {
    it('deletes when exists', async () => {
      imageRepository.mapByPublicId.mockResolvedValue(
        new Map([['p1', { publicId: 'p1' }]]),
      );
      imageRepository.deleteByPublicIds.mockResolvedValue(undefined);
      imageRepository.findByTrip.mockResolvedValue([]);
      const gallery = await service.deleteSingle(userId, tripId, 'p1');
      expect(gallery.totalCount).toBe(0);
    });

    it('throws when missing', async () => {
      imageRepository.mapByPublicId.mockResolvedValue(new Map());
      await expect(
        service.deleteSingle(userId, tripId, 'not'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
