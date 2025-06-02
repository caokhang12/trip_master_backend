import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcryptjs';

/**
 * Migration to seed initial data for development
 */
export class SeedInitialData1701000001000 implements MigrationInterface {
  name = 'SeedInitialData1701000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Only seed in development environment
    if (process.env.NODE_ENV === 'development') {
      // Create test admin user
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      await queryRunner.query(`
        INSERT INTO "users" (
          "id", 
          "email", 
          "password_hash", 
          "first_name", 
          "last_name", 
          "role", 
          "email_verified",
          "created_at",
          "updated_at"
        ) VALUES (
          '550e8400-e29b-41d4-a716-446655440000',
          'admin@tripmaster.com',
          '${adminPasswordHash}',
          'Admin',
          'User',
          'admin',
          true,
          NOW(),
          NOW()
        ) ON CONFLICT ("email") DO NOTHING
      `);

      // Create test regular user
      const userPasswordHash = await bcrypt.hash('user123', 10);
      await queryRunner.query(`
        INSERT INTO "users" (
          "id",
          "email",
          "password_hash",
          "first_name",
          "last_name",
          "role",
          "email_verified",
          "created_at",
          "updated_at"
        ) VALUES (
          '550e8400-e29b-41d4-a716-446655440001',
          'user@tripmaster.com',
          '${userPasswordHash}',
          'Test',
          'User',
          'user',
          true,
          NOW(),
          NOW()
        ) ON CONFLICT ("email") DO NOTHING
      `);

      // Create preferences for test users
      await queryRunner.query(`
        INSERT INTO "user_preferences" (
          "user_id",
          "travel_style",
          "budget_range",
          "interests",
          "dietary_restrictions",
          "accessibility_needs",
          "updated_at"
        ) VALUES (
          '550e8400-e29b-41d4-a716-446655440001',
          '["adventure", "cultural"]'::jsonb,
          '{"min": 1000, "max": 5000, "currency": "USD"}'::jsonb,
          ARRAY['hiking', 'museums', 'local_food'],
          ARRAY['vegetarian'],
          ARRAY[]::text[],
          NOW()
        ) ON CONFLICT ("user_id") DO NOTHING
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove seed data
    await queryRunner.query(`
      DELETE FROM "user_preferences" WHERE "user_id" IN (
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001'
      )
    `);

    await queryRunner.query(`
      DELETE FROM "users" WHERE "email" IN (
        'admin@tripmaster.com',
        'user@tripmaster.com'
      )
    `);
  }
}
