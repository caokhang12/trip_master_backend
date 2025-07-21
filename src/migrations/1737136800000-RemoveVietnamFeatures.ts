import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveVietnamFeatures1737136800000 implements MigrationInterface {
  name = 'RemoveVietnamFeatures1737136800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop vietnam_locations table
    await queryRunner.query(`DROP TABLE IF EXISTS "vietnam_locations" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate vietnam_locations table if needed for rollback
    await queryRunner.query(`
      CREATE TABLE "vietnam_locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "province_id" integer,
        "district_id" integer,
        "ward_id" integer,
        "province_name" character varying(255) NOT NULL,
        "district_name" character varying(255),
        "ward_name" character varying(255),
        "full_name" text NOT NULL,
        "coordinates" geometry(Point,4326),
        "type" character varying(10),
        "slug" character varying(255),
        "name_with_type" character varying(255),
        "path" text,
        "path_with_type" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vietnam_locations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_vietnam_locations_province_district_ward" ON "vietnam_locations" ("province_id", "district_id", "ward_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vietnam_locations_province_name" ON "vietnam_locations" ("province_name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vietnam_locations_coordinates" ON "vietnam_locations" USING GIST ("coordinates")`,
    );
  }
}
