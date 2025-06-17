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
} from '../shared/services/cloudinary.service';
import { UserEntity } from '../schemas/user.entity';
import { TripEntity } from '../schemas/trip.entity';

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
    this.validateFile(file);

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
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    if (files.length > 10) {
      throw new BadRequestException('Maximum 10 files allowed');
    }

    files.forEach((file) => this.validateFile(file));

    // Verify trip ownership
    const trip = await this.tripRepository.findOne({
      where: { id: tripId, userId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found or access denied');
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
    if (!this.isOwner(userId, publicId)) {
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
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File): void {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!file?.mimetype || !allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP images allowed');
    }

    if (!file?.size || file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }
  }

  /**
   * Check if user owns the file
   */
  private isOwner(userId: string, publicId: string): boolean {
    return (
      publicId.includes(`avatars/user_${userId}`) ||
      publicId.includes(`trips/`) ||
      publicId.includes(`general/${userId}`)
    );
  }

  /**
   * Clean up database references
   */
  private async cleanupDatabaseReferences(
    userId: string,
    publicId: string,
  ): Promise<void> {
    // Clean avatar reference
    if (publicId.includes('avatars')) {
      await this.userRepository.update(userId, { avatarUrl: undefined });
    }

    // Clean trip image references
    if (publicId.includes('trips')) {
      const tripIdMatch = publicId.match(/trips\/([^/]+)/);
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
