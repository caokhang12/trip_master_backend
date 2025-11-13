import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateTripBudgetsAndItems1709720000000
  implements MigrationInterface
{
  name = 'CreateTripBudgetsAndItems1709720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // trip_budgets table (idempotent)
    const hasBudgets = await queryRunner.hasTable('trip_budgets');
    if (!hasBudgets) {
      await queryRunner.createTable(
        new Table({
          name: 'trip_budgets',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'gen_random_uuid()',
            },
            { name: 'trip_id', type: 'uuid', isNullable: false },
            {
              name: 'total_budget',
              type: 'numeric',
              precision: 12,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'spent_amount',
              type: 'numeric',
              precision: 12,
              scale: 2,
              isNullable: false,
              default: '0',
            },
            {
              name: 'currency',
              type: 'varchar',
              length: '3',
              isNullable: false,
              default: "'VND'",
            },
            {
              name: 'notify_threshold',
              type: 'numeric',
              precision: 3,
              scale: 2,
              isNullable: false,
              default: '0.8',
            },
            { name: 'created_at', type: 'timestamp', default: 'now()' },
            { name: 'updated_at', type: 'timestamp', default: 'now()' },
          ],
        }),
      );

      await queryRunner.createForeignKey(
        'trip_budgets',
        new TableForeignKey({
          columnNames: ['trip_id'],
          referencedTableName: 'trips',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }

    // enforce one budget per trip
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_trip_budgets_trip_id" ON "trip_budgets" ("trip_id")`,
    );

    // budget_items table (idempotent)
    const hasItems = await queryRunner.hasTable('budget_items');
    if (!hasItems) {
      await queryRunner.createTable(
        new Table({
          name: 'budget_items',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'gen_random_uuid()',
            },
            { name: 'trip_budget_id', type: 'uuid', isNullable: false },
            {
              name: 'category',
              type: 'varchar',
              length: '50',
              isNullable: false,
            },
            {
              name: 'amount',
              type: 'numeric',
              precision: 12,
              scale: 2,
              isNullable: false,
            },
            { name: 'source', type: 'varchar', length: '20', isNullable: true },
            {
              name: 'ref_id',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            { name: 'note', type: 'text', isNullable: true },
            { name: 'created_at', type: 'timestamp', default: 'now()' },
            { name: 'updated_at', type: 'timestamp', default: 'now()' },
          ],
        }),
      );

      await queryRunner.createForeignKey(
        'budget_items',
        new TableForeignKey({
          columnNames: ['trip_budget_id'],
          referencedTableName: 'trip_budgets',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const budgetItemsTable = await queryRunner.getTable('budget_items');
    const budgetItemsFk = budgetItemsTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('trip_budget_id'),
    );
    if (budgetItemsFk)
      await queryRunner.dropForeignKey('budget_items', budgetItemsFk);

    const tripBudgetsTable = await queryRunner.getTable('trip_budgets');
    const tripBudgetsFk = tripBudgetsTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('trip_id'),
    );
    if (tripBudgetsFk)
      await queryRunner.dropForeignKey('trip_budgets', tripBudgetsFk);

    await queryRunner.dropTable('budget_items');
    await queryRunner.dropTable('trip_budgets');
  }
}
