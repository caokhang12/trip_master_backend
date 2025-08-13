import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixActivitiesRelation1754899519334 implements MigrationInterface {
  name = 'FixActivitiesRelation1754899519334';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_itinerary"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_destination"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_activities_itinerary"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_activities_type"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_activities_type_notnull"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "order_index" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "created_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "updated_at" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "image_urls" SET DEFAULT ARRAY[]::text[]`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_704a5fe2080d400189b76938cd" ON "activities" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5ec6a160eac65166c9ab523fea" ON "activities" ("itinerary_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_5ec6a160eac65166c9ab523fea6" FOREIGN KEY ("itinerary_id") REFERENCES "itineraries"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_0f714ef35e7317e3ebc3b4af59a" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_0f714ef35e7317e3ebc3b4af59a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT "FK_5ec6a160eac65166c9ab523fea6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5ec6a160eac65166c9ab523fea"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_704a5fe2080d400189b76938cd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "image_urls" SET DEFAULT ARRAY[]`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "updated_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "created_at" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "order_index" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activities_type_notnull" ON "activities" ("type") WHERE (type IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activities_type" ON "activities" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activities_itinerary" ON "activities" ("itinerary_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_activities_destination" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_activities_itinerary" FOREIGN KEY ("itinerary_id") REFERENCES "itineraries"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
