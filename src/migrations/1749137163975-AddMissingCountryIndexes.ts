import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingCountryIndexes1749137163975
  implements MigrationInterface
{
  name = 'AddMissingCountryIndexes1749137163975';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create indexes for better query performance on country-aware fields
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
    // Drop indexes
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
  }
}
