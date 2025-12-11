import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPreferredCurrencyToUsers1765100000000
  implements MigrationInterface
{
  name = 'AddPreferredCurrencyToUsers1765100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column exists first
    const columnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'preferred_currency'
    `);

    if (columnExists.length === 0) {
      // Add preferred_currency column to users table
      await queryRunner.query(`
        ALTER TABLE "users" 
        ADD COLUMN "preferred_currency" VARCHAR(3) DEFAULT 'VND'
      `);

      // Create index on preferred_currency for better query performance
      await queryRunner.query(`
        CREATE INDEX "idx_users_preferred_currency" 
        ON "users"("preferred_currency")
      `);

      // Update existing users based on their preferred_language
      // Vietnamese users -> VND, others -> USD
      await queryRunner.query(`
        UPDATE "users" 
        SET "preferred_currency" = CASE 
          WHEN "preferred_language" = 'vi' THEN 'VND'
          WHEN "preferred_language" = 'ja' THEN 'JPY'
          WHEN "preferred_language" = 'ko' THEN 'KRW'
          WHEN "preferred_language" = 'zh' THEN 'CNY'
          WHEN "preferred_language" = 'th' THEN 'THB'
          ELSE 'USD'
        END
        WHERE "preferred_currency" IS NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_users_preferred_currency"
    `);

    // Drop column
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "preferred_currency"
    `);
  }
}
