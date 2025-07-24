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

  /**
   * Upload trip images
   */
  async uploadTripImages(
    userId: string,
    tripId: string,
    files: Express.Multer.File[],
  ): Promise<CloudinaryResult[]> {
    FileValidationUtil.validateMultipleFiles(files, 10);

    // Verify trip ownership
    const trip = await this.tripRepository.findOne({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found or access denied');
    }

    // Check image limit (max 20 per trip)
    const currentImageCount = trip.imageUrls?.length || 0;
    const totalAfterUpload = currentImageCount + files.length;

    if (totalAfterUpload > 20) {
      throw new BadRequestException(
        `Image limit exceeded. Current: ${currentImageCount}, Adding: ${files.length}, Max: 20`,
      );
    }

    // Upload files
    const uploadPromises = files.map((file) =>
      this.cloudinaryService.uploadFile(file, `tripmaster/trips/${tripId}`),
    );

    const results = await Promise.all(uploadPromises);

    // Update trip with new images
    const newImageUrls = results.map((result) => result.secureUrl);
    const updatedImageUrls = [...(trip.imageUrls || []), ...newImageUrls];

    const updateData: Partial<TripEntity> = {
      imageUrls: updatedImageUrls,
    };

    // Set thumbnail if this is the first image
    if (!trip.thumbnailUrl && results.length > 0) {
      updateData.thumbnailUrl = results[0].secureUrl;
    }

    await this.tripRepository.update(tripId, updateData);

    this.logger.log(`${results.length} images uploaded for trip ${tripId}`);
    return results;
  }

  /**
   * Delete file
   */
  async deleteFile(
    userId: string,
    publicId: string,
  ): Promise<{ success: boolean }> {
    // Verify ownership
    const isOwner = await this.isOwner(userId, publicId);

    if (!isOwner) {
      throw new BadRequestException('Access denied');
    }

    const success = await this.cloudinaryService.deleteFile(publicId);

    // Update database records
    if (success) {
      await this.cleanupDatabaseReferences(userId, publicId);
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
  private async isOwner(userId: string, publicId: string): Promise<boolean> {
    // Check avatar ownership
    if (publicId.includes('tripmaster/avatars')) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user?.avatarUrl) {
        const userAvatarPublicId = this.cloudinaryService.extractPublicId(
          user.avatarUrl,
        );
        return userAvatarPublicId === publicId;
      }
      return false;
    }

    // Check trip image ownership
    if (publicId.includes('tripmaster/trips')) {
      const tripIdMatch = publicId.match(/tripmaster\/trips\/([^/]+)/);
      if (tripIdMatch) {
        const tripId = tripIdMatch[1];
        const trip = await this.tripRepository.findOne({
          where: { id: tripId, userId },
        });
        return !!trip;
      }
      return false;
    }

    return false;
  }

  /**
   * Clean up database references
   */
  private async cleanupDatabaseReferences(
    userId: string,
    publicId: string,
  ): Promise<void> {
    // Clean avatar reference
    if (publicId.includes('tripmaster/avatars')) {
      this.logger.log(`Detected avatar cleanup for user: ${userId}`);

      // Check current user state before update
      const userBefore = await this.userRepository.findOne({
        where: { id: userId },
      });
      this.logger.log(
        `User before update - avatarUrl: ${userBefore?.avatarUrl}`,
      );

      const updateResult = await this.userRepository.update(userId, {
        avatarUrl: null,
      });
      this.logger.log(`Update result:`, updateResult);

      // Check user state after update
      const userAfter = await this.userRepository.findOne({
        where: { id: userId },
      });
      this.logger.log(`User after update - avatarUrl: ${userAfter?.avatarUrl}`);

      this.logger.log(`Cleaned avatar reference for user: ${userId}`);
    }

    // Clean trip image references
    if (publicId.includes('tripmaster/trips')) {
      const tripIdMatch = publicId.match(/tripmaster\/trips\/([^/]+)/);
      if (tripIdMatch) {
        const tripId = tripIdMatch[1];
        const trip = await this.tripRepository.findOne({
          where: { id: tripId },
        });
        if (trip) {
          const updatedImageUrls = (trip.imageUrls || []).filter(
            (url) => !url.includes(publicId),
          );

          const updateData: Partial<TripEntity> = {
            imageUrls: updatedImageUrls,
          };

          if (trip.thumbnailUrl?.includes(publicId)) {
            updateData.thumbnailUrl = updatedImageUrls[0] || undefined;
          }

          await this.tripRepository.update(tripId, updateData);
        }
      }
    }
  }
}
