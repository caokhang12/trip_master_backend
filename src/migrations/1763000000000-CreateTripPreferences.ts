import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateTripPreferences1763000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'trip_preferences',
        columns: [
          {
            name: 'trip_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'inferred_style',
            type: 'jsonb',
            isNullable: true,
            default: "'[]'::jsonb",
          },
          {
            name: 'dominant_activities',
            type: 'text',
            isNullable: true,
            isArray: true,
            default: "'{}'",
          },
          {
            name: 'food_style',
            type: 'text',
            isNullable: true,
            isArray: true,
            default: "'{}'",
          },
          {
            name: 'weather_adjusted_preferences',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'::jsonb",
          },
          {
            name: 'custom_preferences',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'::jsonb",
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'trip_preferences',
      new TableForeignKey({
        columnNames: ['trip_id'],
        referencedTableName: 'trips',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'trip_preferences',
      new TableIndex({
        name: 'UQ_trip_preferences_trip_id',
        columnNames: ['trip_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'trip_preferences',
      'UQ_trip_preferences_trip_id',
    );
    const table = await queryRunner.getTable('trip_preferences');
    const fk = table?.foreignKeys.find((f) =>
      f.columnNames.includes('trip_id'),
    );
    if (fk) await queryRunner.dropForeignKey('trip_preferences', fk);
    await queryRunner.dropTable('trip_preferences');
  }
}
