import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCountryAwareFieldsToTrips1701000003000
  implements MigrationInterface
{
  name = 'AddCountryAwareFieldsToTrips1701000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new country-aware fields to trips table
    await queryRunner.query(`
      ALTER TABLE "trips" 
      ADD COLUMN IF NOT EXISTS "destination_country" character varying(2),
      ADD COLUMN IF NOT EXISTS "destination_province" character varying(255),
      ADD COLUMN IF NOT EXISTS "destination_city" character varying(255),
      ADD COLUMN IF NOT EXISTS "timezone" character varying(50),
      ADD COLUMN IF NOT EXISTS "default_currency" character varying(3)
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_trips_destination_country" 
      ON "trips" ("destination_country")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_trips_destination_city" 
      ON "trips" ("destination_city")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_trips_timezone" 
      ON "trips" ("timezone")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_trips_default_currency" 
      ON "trips" ("default_currency")
    `);

    // Create composite index for country + city queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_trips_country_city" 
      ON "trips" ("destination_country", "destination_city")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trips_country_city"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_trips_default_currency"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trips_timezone"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_trips_destination_city"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_trips_destination_country"`,
    );

    // Remove the added columns
    await queryRunner.query(`
      ALTER TABLE "trips" 
      DROP COLUMN IF EXISTS "default_currency",
      DROP COLUMN IF EXISTS "timezone",
      DROP COLUMN IF EXISTS "destination_city",
      DROP COLUMN IF EXISTS "destination_province",
      DROP COLUMN IF EXISTS "destination_country"
    `);
  }
}
