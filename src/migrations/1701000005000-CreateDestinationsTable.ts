import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to create destinations table
 */
export class CreateDestinationsTable1701000005000
  implements MigrationInterface
{
  name = 'CreateDestinationsTable1701000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable PostGIS extension if not already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);

    // Create destinations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "destinations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "country" character varying(100) NOT NULL,
        "country_code" character varying(2) NOT NULL,
        "city" character varying(100),
        "province" character varying(100),
        "coordinates" geometry(Point,4326) NOT NULL,
        "description" text,
        "image_urls" text[] DEFAULT '{}',
        "average_budget" jsonb,
        "best_time_to_visit" jsonb,
        "poi_data" jsonb,
        "weather_info" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_destinations_id" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_destinations_country_city" 
      ON "destinations" ("country", "city")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_destinations_coordinates" 
      ON "destinations" USING GIST ("coordinates")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_destinations_country_code" 
      ON "destinations" ("country_code")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_destinations_name" 
      ON "destinations" ("name")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_destinations_name"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_destinations_country_code"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_destinations_coordinates"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_destinations_country_city"`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "destinations"`);
  }
}
