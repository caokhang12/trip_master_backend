import { Controller, Delete, Param, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { AuthenticatedRequest } from 'src/auth/types/authenticated-request';

/**
 * Simplified upload controller for direct file operations
 * Note: Trip image uploads are handled by TripController for better business logic
 * Note: Avatar uploads are handled by UserController for better business logic
 */
@ApiTags('Upload')
@Controller('upload')
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Delete file
   */
  @Delete(':publicId')
  @ApiOperation({ summary: 'Delete file' })
  async deleteFile(
    @Request() req: AuthenticatedRequest,
    @Param('publicId') publicId: string,
  ) {
    const decodedPublicId = decodeURIComponent(publicId);
    return this.uploadService.deleteFile(req.user?.id, decodedPublicId);
  }
}
