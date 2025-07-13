import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableColumn,
} from 'typeorm';

export class CreateRefreshTokensTable1704067200001
  implements MigrationInterface
{
  name = 'CreateRefreshTokensTable1704067200001';

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
    );

    // Create indexes
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
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'failed_login_attempts',
        type: 'integer',
        default: 0,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'locked_until',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'last_login_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'last_login_ip',
        type: 'varchar',
        length: '45',
        isNullable: true,
      }),
    );

    // Migrate existing refresh tokens from users table (if any exist)
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
    await queryRunner.dropColumn('users', 'refresh_token');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back refresh_token column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'refresh_token',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

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

    // Remove new security columns from users table
    await queryRunner.dropColumn('users', 'last_login_ip');
    await queryRunner.dropColumn('users', 'last_login_at');
    await queryRunner.dropColumn('users', 'locked_until');
    await queryRunner.dropColumn('users', 'failed_login_attempts');

    // Drop refresh_tokens table
    await queryRunner.dropTable('refresh_tokens');
  }
}
