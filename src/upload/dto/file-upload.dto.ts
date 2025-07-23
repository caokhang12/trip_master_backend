import { ApiProperty } from '@nestjs/swagger';

/**
 * Simple file upload response DTO
 */
export class FileUploadResponseDto {
  @ApiProperty({ description: 'Cloudinary public ID' })
  publicId: string;

  @ApiProperty({ description: 'File URL' })
  url: string;

  @ApiProperty({ description: 'Secure file URL' })
  secureUrl: string;
}

/**
 * Multiple files upload response DTO
 */
export class MultipleFileUploadResponseDto {
  @ApiProperty({ type: [FileUploadResponseDto], description: 'Uploaded files' })
  files: FileUploadResponseDto[];

  @ApiProperty({ description: 'Total uploaded files count' })
  totalUploaded: number;
}

/**
 * File delete response DTO
 */
export class FileDeleteResponseDto {
  @ApiProperty({ description: 'Whether deletion was successful' })
  success: boolean;

  @ApiProperty({ description: 'Deleted file public ID' })
  publicId: string;
}
