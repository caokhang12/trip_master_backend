import { MigrationInterface, QueryRunner } from 'typeorm';

export class BookingFlightHotelBudgetConfig1762226113603
  implements MigrationInterface
{
  name = 'BookingFlightHotelBudgetConfig1762226113603';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trip_budgets" ALTER COLUMN "notify_threshold" SET DEFAULT '0.8'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trip_budgets" ALTER COLUMN "notify_threshold" SET DEFAULT 0.8`,
    );
  }
}
