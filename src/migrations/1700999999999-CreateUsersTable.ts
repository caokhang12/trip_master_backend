import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to create users table with all necessary fields
 */
export class CreateUsersTable1700999999999 implements MigrationInterface {
  name = 'CreateUsersTable1700999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "first_name" character varying(100),
        "last_name" character varying(100),
        "avatar_url" text,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'user',
        "email_verified" boolean NOT NULL DEFAULT false,
        "email_verification_token" character varying,
        "email_verification_expires" TIMESTAMP,
        "password_reset_token" character varying,
        "password_reset_expires" TIMESTAMP,
        "refresh_token" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for better performance (only if they don't exist)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_email_verification_token" ON "users" ("email_verification_token")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_password_reset_token" ON "users" ("password_reset_token")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_users_password_reset_token"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_users_email_verification_token"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
