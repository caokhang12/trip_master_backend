import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivityPoiColumn1765201000000 implements MigrationInterface {
  name = 'AddActivityPoiColumn1765201000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "poi" jsonb`,
    );

    await queryRunner.query(
      `UPDATE "activities" SET "poi" = metadata->'poi' WHERE "poi" IS NULL AND metadata ? 'poi'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN IF EXISTS "poi"`,
    );
  }
}
