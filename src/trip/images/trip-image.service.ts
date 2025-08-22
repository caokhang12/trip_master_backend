import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v2 as cloudinaryV2 } from 'cloudinary';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripEntity } from '../../schemas/trip.entity';
import { TripImageEntity } from '../../schemas/trip-image.entity';
import { TripImageRepository } from './trip-image.repository';
import { v4 as uuid } from 'uuid';
import {
  ConfirmTripImagesDto,
  DiffTripImagesDto,
  ReorderTripImagesDto,
  SetThumbnailDto,
} from './dto/confirm-images.dto';
import { SignTripImagesRequestDto } from './dto/sign-upload.dto';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from '../../upload/services/cloudinary.service';

export interface GalleryImageDto {
  publicId: string;
  url: string;
  orderIndex: number;
  isThumbnail: boolean;
  thumbnailUrl: string;
}
export interface GalleryDto {
  thumbnail: string | null;
  images: GalleryImageDto[];
  totalCount: number;
}

@Injectable()
export class TripImageService {
  private readonly MAX_IMAGES = 20;
  constructor(
    @InjectRepository(TripEntity)
    private readonly tripRepo: Repository<TripEntity>,
    @InjectRepository(TripImageEntity)
    private readonly imageRepo: Repository<TripImageEntity>,
    private readonly imageRepository: TripImageRepository,
    private readonly config: ConfigService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private async ensureOwnership(
    tripId: string,
    userId: string,
  ): Promise<TripEntity> {
    const trip = await this.tripRepo.findOne({ where: { id: tripId, userId } });
    if (!trip) throw new NotFoundException('Trip not found or access denied');
    return trip;
  }

  async sign(userId: string, tripId: string, dto: SignTripImagesRequestDto) {
    await this.ensureOwnership(tripId, userId);
    const existing = await this.imageRepository.findByTrip(tripId);
    const current = existing.length;
    const count = Math.min(dto.count || 1, this.MAX_IMAGES - current);
    if (count <= 0) throw new BadRequestException('Image limit reached');
    const folder = `tripmaster/trips/${tripId}`;
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME') || '';
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY') || '';
    const uploadSlots = Array.from({ length: count }).map(() => {
      const publicId = `${folder}/${uuid()}`;
      const timestamp = Math.floor(Date.now() / 1000);
      const params: Record<string, string | number> = {
        public_id: publicId,
        folder,
        timestamp,
      };
      const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET') || '';
      const signature: string = cloudinaryV2.utils.api_sign_request(
        params,
        apiSecret,
      );
      return { publicId, folder, timestamp, signature, apiKey, cloudName };
    });
    return {
      uploadSlots,
      remainingCapacity: this.MAX_IMAGES - current - count,
      maxPerTrip: this.MAX_IMAGES,
    };
  }

  async confirm(
    userId: string,
    tripId: string,
    dto: ConfirmTripImagesDto,
  ): Promise<GalleryDto> {
    await this.ensureOwnership(tripId, userId);
    const existing = await this.imageRepository.mapByPublicId(tripId);
    const toInsert: Partial<TripImageEntity>[] = [];
    let orderStart = existing.size;
    dto.images.forEach((img) => {
      if (!img.publicId.startsWith(`tripmaster/trips/${tripId}`)) return;
      if (existing.has(img.publicId)) return;
      toInsert.push({
        tripId,
        publicId: img.publicId,
        url: img.url,
        orderIndex: orderStart++,
        isThumbnail: false,
        confirmed: true,
      });
    });
    if (existing.size + toInsert.length > this.MAX_IMAGES)
      throw new BadRequestException('Exceeds max images');
    await this.imageRepository.insertImages(toInsert);
    if (dto.thumbnailPublicId) {
      if (
        !existing.has(dto.thumbnailPublicId) &&
        !toInsert.find((i) => i.publicId === dto.thumbnailPublicId)
      )
        throw new BadRequestException('thumbnailPublicId not found');
      await this.imageRepository.setThumbnail(tripId, dto.thumbnailPublicId);
    } else if (
      ![...existing.values()].some((i) => i.isThumbnail) &&
      existing.size + toInsert.length > 0
    ) {
      const first =
        dto.thumbnailPublicId ||
        toInsert[0]?.publicId ||
        [...existing.keys()][0];
      if (first) await this.imageRepository.setThumbnail(tripId, first);
    }
    return this.buildGallery(tripId);
  }

  async reorder(
    userId: string,
    tripId: string,
    dto: ReorderTripImagesDto,
  ): Promise<GalleryDto> {
    await this.ensureOwnership(tripId, userId);
    const existing = await this.imageRepository.findByTrip(tripId);
    const existingIds = existing.map((i) => i.publicId);
    if (existingIds.length !== dto.order.length)
      throw new BadRequestException('Order length mismatch');
    const set = new Set(dto.order);
    if (set.size !== dto.order.length)
      throw new BadRequestException('Duplicate in order');
    if (!dto.order.every((id) => existingIds.includes(id)))
      throw new BadRequestException('Unknown publicId');
    await this.imageRepository.reorder(tripId, dto.order);
    return this.buildGallery(tripId);
  }

  async setThumbnail(
    userId: string,
    tripId: string,
    dto: SetThumbnailDto,
  ): Promise<GalleryDto> {
    await this.ensureOwnership(tripId, userId);
    const existing = await this.imageRepository.mapByPublicId(tripId);
    if (!existing.has(dto.publicId))
      throw new BadRequestException('publicId not found');
    await this.imageRepository.setThumbnail(tripId, dto.publicId);
    return this.buildGallery(tripId);
  }

  async diff(
    userId: string,
    tripId: string,
    dto: DiffTripImagesDto,
  ): Promise<GalleryDto> {
    await this.ensureOwnership(tripId, userId);
    const existing = await this.imageRepository.findByTrip(tripId);
    const keepSet = new Set(dto.keep);
    const toRemove = existing.filter((i) => !keepSet.has(i.publicId));
    await this.imageRepository.deleteByPublicIds(
      tripId,
      toRemove.map((i) => i.publicId),
    );
    for (const img of toRemove)
      this.cloudinary.deleteFile(img.publicId).catch(() => undefined);
    if (dto.thumbnailPublicId) {
      if (!keepSet.has(dto.thumbnailPublicId))
        throw new BadRequestException('thumbnailPublicId not in keep list');
      await this.imageRepository.setThumbnail(tripId, dto.thumbnailPublicId);
    } else {
      const remaining = await this.imageRepository.findByTrip(tripId);
      if (remaining.length && !remaining.some((r) => r.isThumbnail))
        await this.imageRepository.setThumbnail(tripId, remaining[0].publicId);
    }
    return this.buildGallery(tripId);
  }

  async deleteSingle(
    userId: string,
    tripId: string,
    publicId: string,
  ): Promise<GalleryDto> {
    await this.ensureOwnership(tripId, userId);
    const existing = await this.imageRepository.mapByPublicId(tripId);
    if (!existing.has(publicId)) throw new NotFoundException('Image not found');
    await this.imageRepository.deleteByPublicIds(tripId, [publicId]);
    this.cloudinary.deleteFile(publicId).catch(() => undefined);
    const remaining = await this.imageRepository.findByTrip(tripId);
    if (remaining.length && !remaining.some((r) => r.isThumbnail))
      await this.imageRepository.setThumbnail(tripId, remaining[0].publicId);
    return this.buildGallery(tripId);
  }

  async buildGallery(tripId: string): Promise<GalleryDto> {
    const images = await this.imageRepository.findByTrip(tripId);
    const mapped: GalleryImageDto[] = images
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((img) => ({
        publicId: img.publicId,
        url: img.url,
        orderIndex: img.orderIndex,
        isThumbnail: img.isThumbnail,
        thumbnailUrl: img.url.replace(
          '/upload/',
          '/upload/w_300,h_200,c_fill/',
        ),
      }));
    return {
      thumbnail: mapped.find((i) => i.isThumbnail)?.url || null,
      images: mapped,
      totalCount: mapped.length,
    };
  }
}
