import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixBudgetEntity1762611512185 implements MigrationInterface {
  name = 'FixBudgetEntity1762611512185';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "budget_items" DROP COLUMN "category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" ADD "category" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_budgets" ALTER COLUMN "notify_threshold" SET DEFAULT '0.8'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trip_budgets" ALTER COLUMN "notify_threshold" SET DEFAULT 0.8`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" DROP COLUMN "category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_items" ADD "category" character varying(50) NOT NULL`,
    );
  }
}
