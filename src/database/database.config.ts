import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { UserEntity } from '../schemas/user.entity';
import { UserPreferencesEntity } from '../schemas/user-preferences.entity';
import { TripEntity } from '../schemas/trip.entity';
import { ItineraryEntity } from '../schemas/itinerary.entity';
import { TripShareEntity } from '../schemas/trip-share.entity';
import { VietnamLocationEntity } from '../schemas/vietnam-location.entity';
import { DestinationEntity } from '../schemas/destination.entity';
import { ActivityCostEntity } from '../schemas/activity-cost.entity';
import { BudgetTrackingEntity } from '../schemas/budget-tracking.entity';

/**
 * Database configuration service that provides TypeORM configuration
 * based on environment variables
 */
@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const isProduction = nodeEnv === 'production';
    const isDevelopment = nodeEnv === 'development';

    // Database credentials are now required from environment variables
    // Test environment should use .env.test file with proper credentials
    const username = this.configService.get<string>('DATABASE_USER');
    const password = this.configService.get<string>('DATABASE_PASSWORD');
    const database = this.configService.get<string>('DATABASE_NAME');

    if (!username || !password || !database) {
      throw new Error(
        `Missing required database configuration. Please ensure DATABASE_USER, DATABASE_PASSWORD, and DATABASE_NAME are set in your environment variables.`,
      );
    }

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
        VietnamLocationEntity,
        DestinationEntity,
        ActivityCostEntity,
        BudgetTrackingEntity,
      ],
      synchronize: false, // Disabled - we use migrations instead
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
