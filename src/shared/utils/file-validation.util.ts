import { BadRequestException } from '@nestjs/common';

/**
 * File validation utility for upload operations
 */
export class FileValidationUtil {
  /**
   * Maximum file size in bytes (5MB)
   */
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024;

  /**
   * Allowed image MIME types
   */
  private static readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  /**
   * Validate a single uploaded file
   * @param file - The uploaded file
   * @throws BadRequestException if validation fails
   */
  static validateSingleFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.validateFileType(file);
    this.validateFileSize(file);
  }

  /**
   * Validate multiple uploaded files
   * @param files - Array of uploaded files
   * @param maxCount - Maximum number of files allowed
   * @throws BadRequestException if validation fails
   */
  static validateMultipleFiles(
    files: Express.Multer.File[],
    maxCount: number = 10,
  ): void {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    if (files.length > maxCount) {
      throw new BadRequestException(`Maximum ${maxCount} files allowed`);
    }

    files.forEach((file, index) => {
      try {
        this.validateSingleFile(file);
      } catch (error) {
        throw new BadRequestException(`File ${index + 1}: ${error.message}`);
      }
    });
  }

  /**
   * Validate file type
   * @param file - The uploaded file
   * @throws BadRequestException if file type is not allowed
   */
  private static validateFileType(file: Express.Multer.File): void {
    if (!file.mimetype || !this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  /**
   * Validate file size
   * @param file - The uploaded file
   * @throws BadRequestException if file is too large
   */
  private static validateFileSize(file: Express.Multer.File): void {
    if (!file.size || file.size > this.MAX_FILE_SIZE) {
      const maxSizeMB = (this.MAX_FILE_SIZE / (1024 * 1024)).toFixed(1);
      throw new BadRequestException(
        `File size must be less than ${maxSizeMB}MB`,
      );
    }
  }

  /**
   * Get multer file filter for validation during upload
   */
  static getMulterFileFilter() {
    return (req: any, file: Express.Multer.File, cb: any) => {
      if (this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only images allowed'), false);
      }
    };
  }

  /**
   * Get multer limits configuration
   */
  static getMulterLimits() {
    return {
      fileSize: this.MAX_FILE_SIZE,
    };
  }
}
