import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy, JwtRefreshStrategy } from './strategies/jwt.strategy';
import { UserEntity } from '../schemas/user.entity';
import { UserPreferencesEntity } from '../schemas/user-preferences.entity';
import { UserModule } from '../users/user.module';

/**
 * Authentication module containing auth services, controllers, and strategies
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserPreferencesEntity]),
    PassportModule,
    UserModule, // Import UserModule instead of declaring UserService directly
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService, UserModule], // Export UserModule to make UserService available
})
export class AuthModule {}
