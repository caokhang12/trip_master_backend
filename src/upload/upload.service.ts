import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CloudinaryService,
  CloudinaryResult,
} from './services/cloudinary.service';
import { UserEntity } from '../schemas/user.entity';
import { TripEntity } from '../schemas/trip.entity';
import { FileValidationUtil } from '../upload/utils/file-validation.util';

/**
 * Simplified upload service
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(TripEntity)
    private readonly tripRepository: Repository<TripEntity>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Upload user avatar
   */
  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<CloudinaryResult> {
    FileValidationUtil.validateSingleFile(file);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete old avatar if exists
    if (user.avatarUrl) {
      const oldPublicId = this.cloudinaryService.extractPublicId(
        user.avatarUrl,
      );
      if (oldPublicId) {
        await this.cloudinaryService.deleteFile(oldPublicId);
      }
    }

    // Upload new avatar
    const result = await this.cloudinaryService.uploadFile(
      file,
      'tripmaster/avatars',
      { width: 200, height: 200 },
    );

    // Update user record
    await this.userRepository.update(userId, { avatarUrl: result.secureUrl });

    this.logger.log(`Avatar uploaded for user ${userId}: ${result.publicId}`);
    return result;
  }

  /** Delete file (avatar or trip image) */
  async deleteFile(
    userId: string,
    publicId: string,
  ): Promise<{ success: boolean }> {
    const ownership = await this.resolveOwnership(userId, publicId);
    if (!ownership.isOwner) {
      throw new BadRequestException('Access denied');
    }
    const success = await this.cloudinaryService.deleteFile(publicId);
    if (success) {
      await this.cleanupDatabaseReferences(ownership);
    }
    return { success };
  }

  /**
   * Extract Cloudinary public ID from URL (delegated to CloudinaryService)
   */
  extractPublicIdFromUrl(url: string): string | null {
    return this.cloudinaryService.extractPublicId(url);
  }

  /**
   * Check if user owns the file
   */
  private async resolveOwnership(
    userId: string,
    publicId: string,
  ): Promise<
    | { isOwner: false }
    | {
        isOwner: true;
        type: 'avatar' | 'trip-image';
        user?: UserEntity;
        trip?: TripEntity;
      }
  > {
    if (publicId.includes('tripmaster/avatars')) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user?.avatarUrl) {
        const userAvatarPublicId = this.cloudinaryService.extractPublicId(
          user.avatarUrl,
        );
        if (userAvatarPublicId === publicId) {
          return { isOwner: true, type: 'avatar', user };
        }
      }
      return { isOwner: false };
    }
    if (publicId.includes('tripmaster/trips')) {
      const tripIdMatch = publicId.match(/tripmaster\/trips\/([^/]+)/);
      if (!tripIdMatch) return { isOwner: false };
      const tripId = tripIdMatch[1];
      const trip = await this.tripRepository.findOne({
        where: { id: tripId, userId },
      });
      if (!trip) return { isOwner: false };
      const imagePublicIds = (trip.images || []).map((i) => i.publicId);
      if (imagePublicIds.includes(publicId)) {
        return { isOwner: true, type: 'trip-image', trip };
      }
      return { isOwner: false };
    }
    return { isOwner: false };
  }
  /**
   * Clean up database references
   */
  private async cleanupDatabaseReferences(
    ownership:
      | { isOwner: false }
      | {
          isOwner: true;
          type: 'avatar' | 'trip-image';
          user?: UserEntity;
          trip?: TripEntity;
        },
  ): Promise<void> {
    if (!ownership.isOwner) return;
    if (ownership.type === 'avatar' && ownership.user) {
      await this.userRepository.update(ownership.user.id, { avatarUrl: null });
      this.logger.log(
        `Cleaned avatar reference for user: ${ownership.user.id}`,
      );
    }
    // trip-image cleanup currently handled elsewhere in new direct upload flow
  }
}
