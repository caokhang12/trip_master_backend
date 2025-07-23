import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for file upload operations
 */
export class FileUploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File to upload',
  })
  readonly file: Express.Multer.File;
}

/**
 * DTO for multiple file uploads
 */
export class MultipleFileUploadDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Files to upload',
  })
  readonly files: Express.Multer.File[];
}

/**
 * DTO for setting trip thumbnail
 */
export class SetThumbnailDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Image URL to set as thumbnail',
    example:
      'https://res.cloudinary.com/demo/image/upload/v1234567890/tripmaster/trips/trip-123/image.jpg',
  })
  readonly imageUrl: string;
}

/**
 * DTO for image gallery response
 */
export class ImageGalleryDto {
  @ApiProperty({
    type: [String],
    description: 'Array of image URLs',
  })
  readonly imageUrls: readonly string[];

  @ApiProperty({
    nullable: true,
    description: 'Thumbnail URL',
  })
  readonly thumbnailUrl: string | null;

  @ApiProperty({
    description: 'Number of images',
  })
  readonly imageCount: number;

  @ApiProperty({
    description: 'Whether trip has images',
  })
  readonly hasImages: boolean;
}

/**
 * DTO for trip with images response
 */
export class TripWithImagesDto {
  @ApiProperty({ description: 'Trip ID' })
  readonly id: string;

  @ApiProperty({ description: 'Trip title' })
  readonly title: string;

  @ApiProperty({ description: 'Trip description' })
  readonly description: string;

  @ApiProperty({ type: ImageGalleryDto, description: 'Image gallery' })
  readonly gallery: ImageGalleryDto;
}

/**
 * DTO for user profile with avatar
 */
export class UserProfileWithAvatarDto {
  @ApiProperty({ description: 'User ID' })
  readonly id: string;

  @ApiProperty({ description: 'User email' })
  readonly email: string;

  @ApiProperty({ description: 'First name' })
  readonly firstName?: string;

  @ApiProperty({ description: 'Last name' })
  readonly lastName?: string;

  @ApiProperty({ nullable: true, description: 'Avatar URL' })
  readonly avatarUrl: string | null;

  @ApiProperty({ description: 'Whether user has avatar' })
  readonly hasAvatar: boolean;

  @ApiProperty({ description: 'Account creation date' })
  readonly createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  readonly updatedAt: Date;
}
