import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultsToUserPreferences1763000000001
  implements MigrationInterface
{
  name = 'AddDefaultsToUserPreferences1763000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // jsonb defaults
    await queryRunner.query(
      'ALTER TABLE "user_preferences" ALTER COLUMN "travel_style" SET DEFAULT \'[]\'::jsonb',
    );
    await queryRunner.query(
      'ALTER TABLE "user_preferences" ALTER COLUMN "budget_range" SET DEFAULT \'{}\'::jsonb',
    );

    // text[] defaults
    await queryRunner.query(
      'ALTER TABLE "user_preferences" ALTER COLUMN "interests" SET DEFAULT \'{}\'',
    );
    await queryRunner.query(
      'ALTER TABLE "user_preferences" ALTER COLUMN "dietary_restrictions" SET DEFAULT \'{}\'',
    );
    await queryRunner.query(
      'ALTER TABLE "user_preferences" ALTER COLUMN "accessibility_needs" SET DEFAULT \'{}\'',
    );

    // Backfill existing NULLs to defaults to avoid null-handling
    await queryRunner.query(
      'UPDATE "user_preferences" SET "travel_style" = \'[]\'::jsonb WHERE "travel_style" IS NULL',
    );
    await queryRunner.query(
      'UPDATE "user_preferences" SET "budget_range" = \'{}\'::jsonb WHERE "budget_range" IS NULL',
    );
    await queryRunner.query(
      'UPDATE "user_preferences" SET "interests" = \'{}\' WHERE "interests" IS NULL',
    );
    await queryRunner.query(
      'UPDATE "user_preferences" SET "dietary_restrictions" = \'{}\' WHERE "dietary_restrictions" IS NULL',
    );
    await queryRunner.query(
      'UPDATE "user_preferences" SET "accessibility_needs" = \'{}\' WHERE "accessibility_needs" IS NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // remove defaults (set back to NULL default)
    await queryRunner.query(
      'ALTER TABLE "user_preferences" ALTER COLUMN "travel_style" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "user_preferences" ALTER COLUMN "budget_range" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "user_preferences" ALTER COLUMN "interests" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "user_preferences" ALTER COLUMN "dietary_restrictions" DROP DEFAULT',
    );
    await queryRunner.query(
      'ALTER TABLE "user_preferences" ALTER COLUMN "accessibility_needs" DROP DEFAULT',
    );
  }
}
