import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixBudgetItemCategoryEnum1765000000000
  implements MigrationInterface
{
  name = 'FixBudgetItemCategoryEnum1765000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      // Create enum type for activity category
      await queryRunner.query(
        `CREATE TYPE "activity_category_enum" AS ENUM('FLIGHT', 'HOTEL', 'TRANSPORT', 'SIGHTSEEING', 'CULTURAL', 'ADVENTURE', 'FOOD', 'SHOPPING', 'RELAXATION', 'NIGHTLIFE', 'NATURE', 'HISTORICAL', 'RELIGIOUS', 'ENTERTAINMENT', 'FESTIVAL', 'SPORT', 'OTHER')`,
      );
    } catch (error: any) {
      // Enum already exists, continue
      if (error.code !== '42P04') throw error;
    }

    try {
      // Convert category column to enum
      await queryRunner.query(
        `ALTER TABLE "budget_items" ALTER COLUMN "category" TYPE "activity_category_enum" USING category::"activity_category_enum"`,
      );
    } catch (error: any) {
      // Column already converted, continue
      if (error.code !== '42804') throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert enum to varchar
    await queryRunner.query(
      `ALTER TABLE "budget_items" ALTER COLUMN "category" TYPE character varying USING category::character varying`,
    );

    // Drop enum type
    await queryRunner.query(`DROP TYPE "activity_category_enum"`);
  }
}
