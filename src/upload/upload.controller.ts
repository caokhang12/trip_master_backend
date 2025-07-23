import { Controller, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';
import { AuthRequest } from 'src/shared/interfaces/auth.interface';

/**
 * Simplified upload controller for direct file operations
 * Note: Trip image uploads are handled by TripController for better business logic
 * Note: Avatar uploads are handled by UserController for better business logic
 */
@ApiTags('Upload')
@Controller('api/v1/upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Delete file
   */
  @Delete(':publicId')
  @ApiOperation({ summary: 'Delete file' })
  async deleteFile(
    @Request() req: AuthRequest,
    @Param('publicId') publicId: string,
  ) {
    const decodedPublicId = decodeURIComponent(publicId);
    return this.uploadService.deleteFile(req.user.id, decodedPublicId);
  }
}
