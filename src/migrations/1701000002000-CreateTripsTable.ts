import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTripsTable1701000002000 implements MigrationInterface {
  name = 'CreateTripsTable1701000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create trips table
    await queryRunner.query(`
      CREATE TABLE "trips" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "destination_name" character varying(255) NOT NULL,
        "destination_coords" json,
        "start_date" date,
        "end_date" date,
        "budget" numeric(10,2),
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "status" character varying(20) NOT NULL DEFAULT 'planning',
        "is_public" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trips" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trips_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create itineraries table
    await queryRunner.query(`
      CREATE TABLE "itineraries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "trip_id" uuid NOT NULL,
        "day_number" integer NOT NULL,
        "date" date,
        "activities" json NOT NULL,
        "ai_generated" boolean NOT NULL DEFAULT false,
        "user_modified" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_itineraries" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_itineraries_trip_id_day_number" UNIQUE ("trip_id", "day_number"),
        CONSTRAINT "FK_itineraries_trip_id" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE
      )
    `);

    // Create trip_shares table
    await queryRunner.query(`
      CREATE TABLE "trip_shares" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "trip_id" uuid NOT NULL,
        "share_token" character varying(255) NOT NULL,
        "expires_at" TIMESTAMP,
        "view_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trip_shares" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_trip_shares_share_token" UNIQUE ("share_token"),
        CONSTRAINT "FK_trip_shares_trip_id" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    await queryRunner.query(
      `CREATE INDEX "IDX_trips_user_id" ON "trips" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_trips_status" ON "trips" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_trips_dates" ON "trips" ("start_date", "end_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_itineraries_trip_id" ON "itineraries" ("trip_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_trip_shares_token" ON "trip_shares" ("share_token")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_trip_shares_token"`);
    await queryRunner.query(`DROP INDEX "IDX_itineraries_trip_id"`);
    await queryRunner.query(`DROP INDEX "IDX_trips_dates"`);
    await queryRunner.query(`DROP INDEX "IDX_trips_status"`);
    await queryRunner.query(`DROP INDEX "IDX_trips_user_id"`);

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE "trip_shares"`);
    await queryRunner.query(`DROP TABLE "itineraries"`);
    await queryRunner.query(`DROP TABLE "trips"`);
  }
}
