import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RefreshTokenService } from './services/refresh-token.service';
import { JwtStrategy, JwtRefreshStrategy } from './strategies/jwt.strategy';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { UserEntity } from '../schemas/user.entity';
import { UserPreferencesEntity } from '../schemas/user-preferences.entity';
import { RefreshTokenEntity } from '../schemas/refresh-token.entity';
import { UserModule } from '../users/user.module';
import authConfig from './config/auth.config';

/**
 * Authentication module containing auth services, controllers, and strategies
 * Enhanced with refresh token management and rate limiting
 */
@Module({
  imports: [
    ConfigModule.forFeature(authConfig),
    TypeOrmModule.forFeature([
      UserEntity,
      UserPreferencesEntity,
      RefreshTokenEntity,
    ]),
    PassportModule,
    UserModule, // Import UserModule instead of declaring UserService directly
    ThrottlerModule.forRoot([
      {
        name: 'auth',
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokenService,
    JwtStrategy,
    JwtRefreshStrategy,
    AdminRoleGuard,
  ],
  exports: [AuthService, RefreshTokenService, AdminRoleGuard], // Export services and guards
})
export class AuthModule {}
