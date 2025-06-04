import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration to add homeCountry and preferredLanguage fields to users table
 * This supports Phase 1 Week 1-2 requirements for enhanced user localization
 */
export class AddUserCountryAndLanguageFields1701000004000
  implements MigrationInterface
{
  name = 'AddUserCountryAndLanguageFields1701000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');

    // Add home_country column if it doesn't exist
    if (!table?.findColumnByName('home_country')) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'home_country',
          type: 'varchar',
          length: '100',
          isNullable: true,
          comment:
            'User home country for localized content and currency preferences',
        }),
      );
    }

    // Add preferred_language column with default value if it doesn't exist
    if (!table?.findColumnByName('preferred_language')) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'preferred_language',
          type: 'varchar',
          length: '10',
          isNullable: true,
          default: "'en'",
          comment:
            'User preferred language for application interface (en, vi, zh, ja, ko, th, fr, de, es)',
        }),
      );
    }

    // Create indexes only if they don't exist
    // Note: TypeORM entity decorators will manage these indexes automatically
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_home_country" 
      ON "users" ("home_country")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_preferred_language" 
      ON "users" ("preferred_language")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first - use IF EXISTS to handle cases where indexes don't exist
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_users_preferred_language"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_home_country"`);

    // Drop columns if they exist
    const table = await queryRunner.getTable('users');
    if (table?.findColumnByName('preferred_language')) {
      await queryRunner.dropColumn('users', 'preferred_language');
    }
    if (table?.findColumnByName('home_country')) {
      await queryRunner.dropColumn('users', 'home_country');
    }
  }
}
