import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateBudgetAuditLog1765000000001 implements MigrationInterface {
  name = 'CreateBudgetAuditLog1765000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for audit actions
    try {
      await queryRunner.query(
        `CREATE TYPE "budget_audit_action_enum" AS ENUM('CREATE_BUDGET', 'UPDATE_BUDGET', 'DELETE_BUDGET', 'ADD_ITEM', 'UPDATE_ITEM', 'DELETE_ITEM', 'THRESHOLD_ALERT')`,
      );
    } catch (error: any) {
      // Enum already exists, continue
      if (error) throw error;
    }

    // Create budget_audit_logs table
    const tableExists = await queryRunner.hasTable('budget_audit_logs');
    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'budget_audit_logs',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'budget_id',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'action',
              type: 'budget_audit_action_enum',
              isNullable: false,
            },
            {
              name: 'previous_value',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'new_value',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'description',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'user_id',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
          foreignKeys: [
            new TableForeignKey({
              columnNames: ['budget_id'],
              referencedColumnNames: ['id'],
              referencedTableName: 'trip_budgets',
              onDelete: 'CASCADE',
            }),
          ],
        }),
        false,
      );

      // Create indexes
      await queryRunner.createIndex(
        'budget_audit_logs',
        new TableIndex({
          name: 'idx_budget_audit_logs_budget_id',
          columnNames: ['budget_id'],
        }),
      );
      await queryRunner.createIndex(
        'budget_audit_logs',
        new TableIndex({
          name: 'idx_budget_audit_logs_action',
          columnNames: ['action'],
        }),
      );
      await queryRunner.createIndex(
        'budget_audit_logs',
        new TableIndex({
          name: 'idx_budget_audit_logs_created_at',
          columnNames: ['created_at'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes and table if they exist - migration is idempotent in reverse
    const tableExists = await queryRunner.hasTable('budget_audit_logs');
    if (tableExists) {
      // Try dropping indexes (they might not exist)
      try {
        await queryRunner.dropIndex(
          'budget_audit_logs',
          'idx_budget_audit_logs_created_at',
        );
      } catch {
        // Index doesn't exist
      }

      try {
        await queryRunner.dropIndex(
          'budget_audit_logs',
          'idx_budget_audit_logs_action',
        );
      } catch {
        // Index doesn't exist
      }

      try {
        await queryRunner.dropIndex(
          'budget_audit_logs',
          'idx_budget_audit_logs_budget_id',
        );
      } catch {
        // Index doesn't exist
      }

      // Drop table
      await queryRunner.dropTable('budget_audit_logs');
    }

    // Drop enum if it exists
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "budget_audit_action_enum"`);
    } catch {
      // Enum doesn't exist
    }
  }
}
