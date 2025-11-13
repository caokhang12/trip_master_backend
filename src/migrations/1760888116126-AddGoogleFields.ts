import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleFields1760888116126 implements MigrationInterface {
  name = 'AddGoogleFields1760888116126';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_43ff9c8aae8700cab0df047ef8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4542dd2f38a61354a040ba9fd5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "is_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "device_info"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "is_revoked" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "provider" character varying(50) NOT NULL DEFAULT 'local'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "oauth_id" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_14187aa4d2d58318c82c62c7ea" ON "refresh_tokens" ("user_id", "is_revoked") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_14187aa4d2d58318c82c62c7ea"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "oauth_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "provider"`);
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "is_revoked"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "device_info" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4542dd2f38a61354a040ba9fd5" ON "refresh_tokens" ("token") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_43ff9c8aae8700cab0df047ef8" ON "refresh_tokens" ("user_id", "is_active") `,
    );
  }
}
