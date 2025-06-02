import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { UserEntity } from '../schemas/user.entity';
import { UserPreferencesEntity } from '../schemas/user-preferences.entity';

/**
 * Database configuration service that provides TypeORM configuration
 * based on environment variables
 */
@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Creates TypeORM configuration options
   */
  createTypeOrmOptions(): TypeOrmModuleOptions {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const isProduction = nodeEnv === 'production';
    const isDevelopment = nodeEnv === 'development';

    return {
      type: 'postgres',
      host: this.configService.get<string>('DATABASE_HOST', 'localhost'),
      port: this.configService.get<number>('DATABASE_PORT', 5432),
      username: this.configService.get<string>('DATABASE_USER'),
      password: this.configService.get<string>('DATABASE_PASSWORD'),
      database: this.configService.get<string>('DATABASE_NAME'),
      entities: [UserEntity, UserPreferencesEntity],
      synchronize: isDevelopment, // Only in development
      logging: isDevelopment ? ['query', 'error'] : ['error'],
      autoLoadEntities: true,
      ssl: isProduction
        ? {
            rejectUnauthorized: false,
          }
        : false,
      retryAttempts: 3,
      retryDelay: 3000,
      // Migration configuration
      migrations: ['dist/migrations/*.js'],
      migrationsTableName: 'migrations_history',
      migrationsRun: false, // We'll run migrations manually
    };
  }
}
