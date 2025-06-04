import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { UserEntity } from '../schemas/user.entity';
import { UserPreferencesEntity } from '../schemas/user-preferences.entity';
import { TripEntity } from '../schemas/trip.entity';
import { ItineraryEntity } from '../schemas/itinerary.entity';
import { TripShareEntity } from '../schemas/trip-share.entity';

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
    const isTest = nodeEnv === 'test';

    // For testing, we'll try PostgreSQL first, and if it fails, the integration tests will be skipped
    // SQLite doesn't support JSONB columns used in our entities

    // Handle missing credentials gracefully for testing
    const username =
      this.configService.get<string>('DATABASE_USER') ||
      (isTest ? 'postgres' : '');
    const password =
      this.configService.get<string>('DATABASE_PASSWORD') || (isTest ? '' : '');
    const database =
      this.configService.get<string>('DATABASE_NAME') ||
      (isTest ? 'trip_master_test' : '');

    return {
      type: 'postgres' as const,
      host: this.configService.get<string>('DATABASE_HOST', 'localhost'),
      port: this.configService.get<number>('DATABASE_PORT', 5432),
      username,
      password: password || undefined,
      database,
      entities: [
        UserEntity,
        UserPreferencesEntity,
        TripEntity,
        ItineraryEntity,
        TripShareEntity,
      ],
      synchronize: isDevelopment || isTest, // Enable for development and testing
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
