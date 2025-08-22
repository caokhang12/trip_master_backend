import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTripImageConfirmationFields1755577236250
  implements MigrationInterface
{
  name = 'AddTripImageConfirmationFields1755577236250';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "trip_images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "trip_id" uuid NOT NULL, "public_id" character varying(255) NOT NULL, "url" text NOT NULL, "is_thumbnail" boolean NOT NULL DEFAULT false, "order_index" integer NOT NULL DEFAULT '0', "confirmed" boolean NOT NULL DEFAULT true, "uploaded_at" TIMESTAMP NOT NULL DEFAULT now(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7f833994ab54739b6b1273c3507" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cadbcfa5b6e10fec06fa12f0b1" ON "trip_images" ("trip_id") `,
    );
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "image_urls"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "thumbnail_url"`);
    await queryRunner.query(
      `ALTER TABLE "trip_images" ADD CONSTRAINT "FK_cadbcfa5b6e10fec06fa12f0b13" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trip_images" DROP CONSTRAINT "FK_cadbcfa5b6e10fec06fa12f0b13"`,
    );
    await queryRunner.query(`ALTER TABLE "trips" ADD "thumbnail_url" text`);
    await queryRunner.query(
      `ALTER TABLE "trips" ADD "image_urls" text array NOT NULL DEFAULT ARRAY[]`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cadbcfa5b6e10fec06fa12f0b1"`,
    );
    await queryRunner.query(`DROP TABLE "trip_images"`);
  }
}
