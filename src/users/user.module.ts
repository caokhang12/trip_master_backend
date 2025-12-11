import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './users.repository';
import { UserEntity } from '../schemas/user.entity';
import { UserPreferencesEntity } from '../schemas/user-preferences.entity';
import { RefreshTokenEntity } from '../schemas/refresh-token.entity';
import { UploadModule } from '../upload/upload.module';

/**
 * User module containing user profile management services and controllers
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserPreferencesEntity,
      RefreshTokenEntity,
    ]),
    UploadModule,
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
