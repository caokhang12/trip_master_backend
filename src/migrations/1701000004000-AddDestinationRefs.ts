import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDestinationRefs1701000004000 implements MigrationInterface {
  name = 'AddDestinationRefs1701000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add place_id to destinations
    await queryRunner.query(
      `ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "place_id" character varying(255)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_destinations_place_id" ON "destinations" ("place_id")`,
    );

    // Add primary_destination_id to trips
    await queryRunner.query(
      `ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "primary_destination_id" uuid NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_trips_primary_destination_id" ON "trips" ("primary_destination_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ADD CONSTRAINT "FK_trips_primary_destination_id" FOREIGN KEY ("primary_destination_id") REFERENCES "destinations"("id") ON DELETE SET NULL`,
    );

    // Add destination_id to itineraries
    await queryRunner.query(
      `ALTER TABLE "itineraries" ADD COLUMN IF NOT EXISTS "destination_id" uuid NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_itineraries_destination_id" ON "itineraries" ("destination_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "itineraries" ADD CONSTRAINT "FK_itineraries_destination_id" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys and indexes
    await queryRunner.query(
      `ALTER TABLE "itineraries" DROP CONSTRAINT IF EXISTS "FK_itineraries_destination_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_itineraries_destination_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "itineraries" DROP COLUMN IF EXISTS "destination_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "trips" DROP CONSTRAINT IF EXISTS "FK_trips_primary_destination_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_trips_primary_destination_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" DROP COLUMN IF EXISTS "primary_destination_id"`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_destinations_place_id"`);
    await queryRunner.query(
      `ALTER TABLE "destinations" DROP COLUMN IF EXISTS "place_id"`,
    );
  }
}
