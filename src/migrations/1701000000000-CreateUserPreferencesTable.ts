import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to create user_preferences table
 */
export class CreateUserPreferencesTable1701000000000
  implements MigrationInterface
{
  name = 'CreateUserPreferencesTable1701000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_preferences" (
        "user_id" uuid NOT NULL,
        "travel_style" jsonb,
        "budget_range" jsonb,
        "interests" text array,
        "dietary_restrictions" text array,
        "accessibility_needs" text array,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_preferences_user_id" PRIMARY KEY ("user_id"),
        CONSTRAINT "FK_user_preferences_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_preferences_user_id" ON "user_preferences" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_preferences_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "user_preferences"`);
  }
}
