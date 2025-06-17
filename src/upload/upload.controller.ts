import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Request,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

interface AuthRequest extends Request {
  user: { id: string };
}

/**
 * Simplified upload controller
 */
@ApiTags('Upload')
@Controller('api/v1/upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Upload user avatar
   */
  @Post('avatar')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/^image\/(jpeg|jpg|png|webp)$/)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only images allowed'), false);
        }
      },
    }),
  )
  async uploadAvatar(
    @Request() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.uploadService.uploadAvatar(req.user.id, file);
  }

  /**
   * Upload trip images
   */
  @Post('trip/:tripId/images')
  @ApiOperation({ summary: 'Upload trip images' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/^image\/(jpeg|jpg|png|webp)$/)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only images allowed'), false);
        }
      },
    }),
  )
  async uploadTripImages(
    @Request() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    return this.uploadService.uploadTripImages(req.user.id, tripId, files);
  }

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
