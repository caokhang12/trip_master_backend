import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiOptions,
} from 'cloudinary';
import * as streamifier from 'streamifier';

/**
 * Simple Cloudinary upload result interface
 */
export interface CloudinaryResult {
  publicId: string;
  url: string;
  secureUrl: string;
}

/**
 * Simplified Cloudinary service for file uploads
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    this.configure();
  }

  /**
   * Configure Cloudinary
   */
  private configure(): void {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload file to Cloudinary
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    options?: { width?: number; height?: number },
  ): Promise<CloudinaryResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions: UploadApiOptions = {
        folder,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
      };

      if (options?.width || options?.height) {
        uploadOptions.transformation = {
          width: options.width,
          height: options.height,
          crop: 'fill',
          quality: 'auto',
          format: 'auto',
        };
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error('Upload failed:', error);
            reject(new Error(`Upload failed: ${error.message}`));
            return;
          }

          if (!result) {
            reject(new Error('Upload failed: No result returned'));
            return;
          }

          resolve({
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFile(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return (result as { result: string }).result === 'ok';
    } catch (error) {
      this.logger.error('Delete failed:', error);
      return false;
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  extractPublicId(url: string): string | null {
    const match = url.match(/\/v\d+\/(.+)\.[a-zA-Z]{3,4}$/);
    return match ? match[1] : null;
  }
}
