import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateRefreshTokensTable1704067200000
  implements MigrationInterface
{
  name = 'CreateRefreshTokensTable1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create refresh_tokens table
    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'token',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'device_info',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'last_used_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    ); // Create indexes
    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_refresh_tokens_token',
        columnNames: ['token'],
      }),
    );

    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_refresh_tokens_user_active',
        columnNames: ['user_id', 'is_active'],
      }),
    );

    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_refresh_tokens_expires_at',
        columnNames: ['expires_at'],
      }),
    );

    // Add new security fields to users table
    await queryRunner.query(`
      ALTER TABLE users 
      ADD COLUMN failed_login_attempts INTEGER DEFAULT 0,
      ADD COLUMN locked_until TIMESTAMP,
      ADD COLUMN last_login_at TIMESTAMP,
      ADD COLUMN last_login_ip VARCHAR(45)
    `);

    // Migrate existing refresh tokens from users table to refresh_tokens table
    await queryRunner.query(`
      INSERT INTO refresh_tokens (token, user_id, expires_at, is_active, created_at)
      SELECT 
        refresh_token,
        id,
        CURRENT_TIMESTAMP + INTERVAL '7 days',
        true,
        CURRENT_TIMESTAMP
      FROM users 
      WHERE refresh_token IS NOT NULL AND refresh_token != ''
    `);

    // Remove refresh_token column from users table
    await queryRunner.query(`ALTER TABLE users DROP COLUMN refresh_token`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back refresh_token column to users table
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN refresh_token VARCHAR(255)
    `);

    // Migrate latest refresh token back to users table
    await queryRunner.query(`
      UPDATE users 
      SET refresh_token = rt.token
      FROM (
        SELECT DISTINCT ON (user_id) user_id, token
        FROM refresh_tokens 
        WHERE is_active = true
        ORDER BY user_id, created_at DESC
      ) rt
      WHERE users.id = rt.user_id
    `);

    // Remove security fields from users table
    await queryRunner.query(`
      ALTER TABLE users 
      DROP COLUMN failed_login_attempts,
      DROP COLUMN locked_until,
      DROP COLUMN last_login_at,
      DROP COLUMN last_login_ip
    `);

    // Drop indexes first
    await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_token');
    await queryRunner.dropIndex(
      'refresh_tokens',
      'IDX_refresh_tokens_user_active',
    );
    await queryRunner.dropIndex(
      'refresh_tokens',
      'IDX_refresh_tokens_expires_at',
    );

    // Drop refresh_tokens table
    await queryRunner.dropTable('refresh_tokens');
  }
}
