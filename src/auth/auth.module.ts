import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy, JwtRefreshStrategy } from './strategies/jwt.strategy';
import { UserEntity } from '../schemas/user.entity';
import { UserPreferencesEntity } from '../schemas/user-preferences.entity';
import { UserService } from '../users/user.service';

/**
 * Authentication module containing auth services, controllers, and strategies
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserPreferencesEntity]),
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService, UserService],
})
export class AuthModule {}
