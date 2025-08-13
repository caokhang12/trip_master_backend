import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTripRelate1755060245411 implements MigrationInterface {
  name = 'UpdateTripRelate1755060245411';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create reviews table with integer rating and composite unique constraints
    await queryRunner.query(
      `CREATE TABLE "reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "trip_id" uuid, "destination_id" uuid, "rating" integer NOT NULL, "comment" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "CHK_reviews_target_present" CHECK ((trip_id IS NOT NULL AND destination_id IS NULL) OR (destination_id IS NOT NULL AND trip_id IS NULL)), CONSTRAINT "CHK_reviews_rating" CHECK (rating >= 1 AND rating <= 5), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_review_user_trip" ON "reviews" ("user_id", "trip_id") WHERE trip_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_review_user_destination" ON "reviews" ("user_id", "destination_id") WHERE destination_id IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" DROP COLUMN "destination_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" DROP COLUMN "destination_coords"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" DROP COLUMN "destination_country"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" DROP COLUMN "destination_province"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" DROP COLUMN "destination_city"`,
    );
    // Add destination_id as NULLABLE first to avoid failing on existing rows
    await queryRunner.query(
      `ALTER TABLE "itineraries" ADD "destination_id" uuid`,
    );
    // Backfill strategy: set destination_id to NULL for now (if you have mapping logic, apply here)
    // Then enforce NOT NULL only if data is guaranteed present. Otherwise keep it nullable until data migration is done.
    // await queryRunner.query(`UPDATE "itineraries" SET destination_id = ???`);
    // If not ready to enforce, comment out the following line or ensure data exists before applying
    // await queryRunner.query(`ALTER TABLE "itineraries" ALTER COLUMN "destination_id" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "image_urls" SET DEFAULT ARRAY[]::text[]`,
    );
    await queryRunner.query(
      `ALTER TABLE "itineraries" ADD CONSTRAINT "FK_3a9b2a3b41eb13c854882f2afc0" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_362e169dcc383ce7bb4ddf021ff" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_b562c932fa2dd45cb52bd0a2084" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_b562c932fa2dd45cb52bd0a2084"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_362e169dcc383ce7bb4ddf021ff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "itineraries" DROP CONSTRAINT "FK_3a9b2a3b41eb13c854882f2afc0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "image_urls" SET DEFAULT ARRAY[]`,
    );
    await queryRunner.query(
      `ALTER TABLE "itineraries" DROP COLUMN "destination_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "destination_city" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "destination_province" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "destination_country" character varying(2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "destination_coords" json`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "destination_name" character varying(255) NOT NULL`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_review_user_destination"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_review_user_trip"`);
    await queryRunner.query(`DROP TABLE "reviews"`);
  }
}
