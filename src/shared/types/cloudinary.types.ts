import { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';

/**
 * Union type for Cloudinary responses
 */
export type CloudinaryResponse = UploadApiResponse | UploadApiErrorResponse;

/**
 * Type guard to check if response is successful
 */
export function isCloudinarySuccess(
  response: CloudinaryResponse,
): response is UploadApiResponse {
  return 'public_id' in response && 'secure_url' in response;
}

/**
 * Type guard to check if response is an error
 */
export function isCloudinaryError(
  response: CloudinaryResponse,
): response is UploadApiErrorResponse {
  return 'error' in response;
}

/**
 * Enhanced upload options with signing support
 */
export interface SignedUploadOptions {
  folder: string;
  transformation?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
    format?: string;
  };
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  publicId?: string;
  tags?: string[];
  context?: Record<string, string>;
  metadata?: Record<string, string>;
  overwrite?: boolean;
  timestamp?: number;
  signature?: string;
}

/**
 * Standardized upload result interface
 */
export interface StandardizedUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  resourceType: string;
  signature: string;
  version: number;
  createdAt: string;
}
