import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAiRunsTable1765300000000 implements MigrationInterface {
  name = 'CreateAiRunsTable1765300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('ai_runs');
    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'ai_runs',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'request_id',
              type: 'varchar',
              length: '64',
              isNullable: true,
            },
            {
              name: 'user_id',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'trip_id',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'task_type',
              type: 'varchar',
              length: '64',
              isNullable: true,
            },
            {
              name: 'provider',
              type: 'varchar',
              length: '32',
              isNullable: true,
            },
            {
              name: 'fallback_used',
              type: 'boolean',
              default: false,
            },
            {
              name: 'cache_redis_hit',
              type: 'boolean',
              default: false,
            },
            {
              name: 'cache_memory_hit',
              type: 'boolean',
              default: false,
            },
            {
              name: 'total_ms',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'provider_ms',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'parse_ms',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'json_valid',
              type: 'boolean',
              default: false,
            },
            {
              name: 'json_repaired',
              type: 'boolean',
              default: false,
            },
            {
              name: 'schema_errors_count',
              type: 'int',
              default: 0,
            },
            {
              name: 'days_count',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'activities_count',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'poi_count',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'poi_dropped_count',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'prompt_hash',
              type: 'varchar',
              length: '64',
              isNullable: true,
            },
            {
              name: 'prompt_length',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'response_length',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'currency_hint',
              type: 'varchar',
              length: '8',
              isNullable: true,
            },
            {
              name: 'error_message',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        false,
      );

      await queryRunner.createIndex(
        'ai_runs',
        new TableIndex({
          name: 'idx_ai_runs_created_at',
          columnNames: ['created_at'],
        }),
      );
      await queryRunner.createIndex(
        'ai_runs',
        new TableIndex({
          name: 'idx_ai_runs_request_id',
          columnNames: ['request_id'],
        }),
      );
      await queryRunner.createIndex(
        'ai_runs',
        new TableIndex({
          name: 'idx_ai_runs_user_id',
          columnNames: ['user_id'],
        }),
      );
      await queryRunner.createIndex(
        'ai_runs',
        new TableIndex({
          name: 'idx_ai_runs_trip_id',
          columnNames: ['trip_id'],
        }),
      );
      await queryRunner.createIndex(
        'ai_runs',
        new TableIndex({
          name: 'idx_ai_runs_task_type',
          columnNames: ['task_type'],
        }),
      );
      await queryRunner.createIndex(
        'ai_runs',
        new TableIndex({
          name: 'idx_ai_runs_provider',
          columnNames: ['provider'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('ai_runs');
    if (tableExists) {
      try {
        await queryRunner.dropIndex('ai_runs', 'idx_ai_runs_provider');
      } catch {
        // ignore
      }
      try {
        await queryRunner.dropIndex('ai_runs', 'idx_ai_runs_task_type');
      } catch {
        // ignore
      }
      try {
        await queryRunner.dropIndex('ai_runs', 'idx_ai_runs_trip_id');
      } catch {
        // ignore
      }
      try {
        await queryRunner.dropIndex('ai_runs', 'idx_ai_runs_user_id');
      } catch {
        // ignore
      }
      try {
        await queryRunner.dropIndex('ai_runs', 'idx_ai_runs_request_id');
      } catch {
        // ignore
      }
      try {
        await queryRunner.dropIndex('ai_runs', 'idx_ai_runs_created_at');
      } catch {
        // ignore
      }

      await queryRunner.dropTable('ai_runs');
    }
  }
}
