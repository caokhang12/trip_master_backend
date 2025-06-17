/**
 * Type definitions for upload image integration
 */

export interface UserAvatarUpdateParams {
  readonly userId: string;
  readonly file: Express.Multer.File;
}

export interface UserProfileDto {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly avatarUrl: string | null;
  readonly hasAvatar: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface TripImageUploadParams {
  readonly tripId: string;
  readonly userId: string;
  readonly files: Express.Multer.File[];
}

export interface TripImageRemovalParams {
  readonly tripId: string;
  readonly userId: string;
  readonly publicId: string;
}

export interface TripThumbnailParams {
  readonly tripId: string;
  readonly userId: string;
  readonly imageUrl: string;
}

export interface TripDetailDto {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly imageUrls: readonly string[];
  readonly thumbnailUrl: string | null;
  readonly imageCount: number;
  readonly hasImages: boolean;
  readonly gallery: TripImageGallery;
}

export interface TripImageGallery {
  readonly thumbnail: string | null;
  readonly images: readonly TripImageItem[];
  readonly totalCount: number;
}

export interface TripImageItem {
  readonly url: string;
  readonly publicId: string;
  readonly thumbnailUrl: string;
  readonly isSelected: boolean;
}

export interface CloudinaryTransformation {
  readonly width?: number;
  readonly height?: number;
  readonly crop?: string;
  readonly quality?: string | number;
  readonly format?: string;
}
