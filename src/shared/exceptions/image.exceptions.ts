import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

/**
 * Custom exceptions for image upload operations
 */

export class ImageUploadException extends BadRequestException {
  constructor(message: string, code: string) {
    super({
      message,
      code,
      type: 'IMAGE_UPLOAD_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}

export class ImageNotOwnedException extends ForbiddenException {
  constructor(resource = 'image') {
    super({
      message: `You do not have permission to modify this ${resource}`,
      code: 'IMAGE_NOT_OWNED',
      type: 'PERMISSION_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}

export class ImageLimitExceededException extends BadRequestException {
  constructor(currentCount: number, maxCount: number, resource = 'images') {
    super({
      message: `${resource} limit exceeded. Current: ${currentCount}, Max: ${maxCount}`,
      code: 'IMAGE_LIMIT_EXCEEDED',
      type: 'VALIDATION_ERROR',
      currentCount,
      maxCount,
      timestamp: new Date().toISOString(),
    });
  }
}

export class ImageNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super({
      message: `Image not found: ${identifier}`,
      code: 'IMAGE_NOT_FOUND',
      type: 'RESOURCE_ERROR',
      identifier,
      timestamp: new Date().toISOString(),
    });
  }
}

export class InvalidImageFormatException extends BadRequestException {
  constructor(allowedFormats: string[] = ['JPEG', 'PNG', 'WebP']) {
    super({
      message: `Invalid image format. Allowed formats: ${allowedFormats.join(', ')}`,
      code: 'INVALID_IMAGE_FORMAT',
      type: 'VALIDATION_ERROR',
      allowedFormats,
      timestamp: new Date().toISOString(),
    });
  }
}

export class ImageSizeExceededException extends BadRequestException {
  constructor(fileSize: number, maxSize: number) {
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);

    super({
      message: `File size ${fileSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB`,
      code: 'IMAGE_SIZE_EXCEEDED',
      type: 'VALIDATION_ERROR',
      fileSize,
      maxSize,
      timestamp: new Date().toISOString(),
    });
  }
}

export class CloudinaryUploadException extends BadRequestException {
  constructor(originalError: string) {
    super({
      message: 'Failed to upload image to cloud storage',
      code: 'CLOUDINARY_UPLOAD_FAILED',
      type: 'EXTERNAL_SERVICE_ERROR',
      originalError,
      timestamp: new Date().toISOString(),
    });
  }
}

export class ImageProcessingException extends BadRequestException {
  constructor(operation: string, details?: string) {
    super({
      message: `Image processing failed: ${operation}`,
      code: 'IMAGE_PROCESSING_FAILED',
      type: 'PROCESSING_ERROR',
      operation,
      details,
      timestamp: new Date().toISOString(),
    });
  }
}
