import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RefreshTokenEntity } from '../schemas/refresh-token.entity';
import { UploadModule } from '../upload/upload.module';
import { JwtStrategy } from './jwt.strategy';
import { SharedModule } from '../shared/shared.module';
import { UserModule } from 'src/users/user.module';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    SharedModule, // Provides ConfigModule + JwtModule (access token)
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([RefreshTokenEntity]),
    UploadModule,
    UserModule,
    // JwtModule already registered globally in SharedModule; keep here if needed for local overrides
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Global JWT guard (public endpoints can be added later with decorator if needed)
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
