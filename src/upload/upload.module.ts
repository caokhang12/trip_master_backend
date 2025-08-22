import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { CloudinaryService } from './services/cloudinary.service';
import { UserEntity } from '../schemas/user.entity';
import { TripEntity } from '../schemas/trip.entity';
import { TripImageEntity } from '../schemas/trip-image.entity';

/**
 * Simple upload module
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, TripEntity, TripImageEntity]),
  ],
  controllers: [UploadController],
  providers: [UploadService, CloudinaryService],
  exports: [UploadService, CloudinaryService],
})
export class UploadModule {}
