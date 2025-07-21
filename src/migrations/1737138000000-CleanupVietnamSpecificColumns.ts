import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to clean up Vietnam-specific and redundant columns after Vietnam feature removal
 */
export class CleanupVietnamSpecificColumns1737138000000
  implements MigrationInterface
{
  name = 'CleanupVietnamSpecificColumns1737138000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop vietnam_locations table completely (if it still exists)
    await queryRunner.query(`DROP TABLE IF EXISTS "vietnam_locations" CASCADE`);

    // Remove default_currency column from trips table (redundant with currency column)
    await queryRunner.query(
      `ALTER TABLE "trips" DROP COLUMN IF EXISTS "default_currency"`,
    );

    // Drop related indexes for removed columns
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_trips_default_currency"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate default_currency column
    await queryRunner.query(
      `ALTER TABLE "trips" ADD COLUMN "default_currency" character varying(3)`,
    );

    // Recreate index for default_currency
    await queryRunner.query(
      `CREATE INDEX "IDX_trips_default_currency" ON "trips" ("default_currency")`,
    );

    // Note: vietnam_locations table is not recreated in rollback as it was Vietnam-specific
    // If needed, refer to previous migration 1737136800000-RemoveVietnamFeatures.ts
  }
}
