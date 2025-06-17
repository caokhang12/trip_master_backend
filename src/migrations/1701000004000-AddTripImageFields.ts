import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTripImageFields1701000004000 implements MigrationInterface {
  name = 'AddTripImageFields1701000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add image_urls array column to trips table
    await queryRunner.query(`
      ALTER TABLE "trips" 
      ADD COLUMN "image_urls" text[] DEFAULT ARRAY[]::text[]
    `);

    // Add thumbnail_url column to trips table
    await queryRunner.query(`
      ALTER TABLE "trips" 
      ADD COLUMN "thumbnail_url" text
    `);

    // Create index for trips with images
    await queryRunner.query(`
      CREATE INDEX "idx_trips_has_images" 
      ON "trips" USING GIN("image_urls") 
      WHERE array_length("image_urls", 1) > 0
    `);

    // Create index for thumbnail searches
    await queryRunner.query(`
      CREATE INDEX "idx_trips_thumbnail" 
      ON "trips" ("thumbnail_url") 
      WHERE "thumbnail_url" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_trips_thumbnail"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_trips_has_images"`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "thumbnail_url"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "image_urls"`);
  }
}
