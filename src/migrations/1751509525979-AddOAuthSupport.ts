import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOAuthSupport1751509525979 implements MigrationInterface {
  name = 'AddOAuthSupport1751509525979';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "provider_type" character varying(20) NOT NULL DEFAULT 'local'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "provider_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "is_oauth_user" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "oauth_profile" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "image_urls" SET DEFAULT ARRAY[]::text[]`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3670c4ae4b8e83630070274b14" ON "users" ("provider_type", "provider_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3670c4ae4b8e83630070274b14"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trips" ALTER COLUMN "image_urls" SET DEFAULT ARRAY[]`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "oauth_profile"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_oauth_user"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "provider_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "provider_type"`);
  }
}
