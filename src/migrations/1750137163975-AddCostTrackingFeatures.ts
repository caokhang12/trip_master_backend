import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCostTrackingFeatures1750137163975
  implements MigrationInterface
{
  name = 'AddCostTrackingFeatures1750137163975';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add cost fields to existing itineraries table
    await queryRunner.query(`
      ALTER TABLE "itineraries" 
      ADD COLUMN IF NOT EXISTS "estimated_cost" decimal(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "actual_cost" decimal(10,2),
      ADD COLUMN IF NOT EXISTS "cost_currency" varchar(3) DEFAULT 'USD',
      ADD COLUMN IF NOT EXISTS "cost_breakdown" jsonb
    `);

    // Create activity_costs table for granular cost tracking
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "activity_costs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "itinerary_id" uuid NOT NULL,
        "activity_index" integer NOT NULL,
        "cost_type" varchar(50) NOT NULL,
        "estimated_amount" decimal(10,2) NOT NULL,
        "actual_amount" decimal(10,2),
        "currency" varchar(3) NOT NULL DEFAULT 'USD',
        "cost_source" varchar(100),
        "notes" text,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT "FK_activity_costs_itinerary" FOREIGN KEY ("itinerary_id") REFERENCES "itineraries"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_activity_costs_unique" UNIQUE ("itinerary_id", "activity_index", "cost_type")
      )
    `);

    // Create budget_tracking table for trip-level budget management
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "budget_tracking" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "trip_id" uuid NOT NULL,
        "category" varchar(50) NOT NULL,
        "budgeted_amount" decimal(10,2) NOT NULL,
        "spent_amount" decimal(10,2) DEFAULT 0,
        "currency" varchar(3) DEFAULT 'USD',
        "auto_calculated" boolean DEFAULT true,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT "FK_budget_tracking_trip" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_budget_tracking_trip_category" UNIQUE ("trip_id", "category")
      )
    `);

    // Add cost tracking flag to trips table
    await queryRunner.query(`
      ALTER TABLE "trips" 
      ADD COLUMN IF NOT EXISTS "enable_cost_tracking" boolean DEFAULT true
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_itineraries_cost" ON "itineraries" ("estimated_cost", "cost_currency")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_activity_costs_itinerary" ON "activity_costs" ("itinerary_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_activity_costs_type" ON "activity_costs" ("cost_type")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_budget_tracking_trip" ON "budget_tracking" ("trip_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_budget_tracking_trip"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_activity_costs_type"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_activity_costs_itinerary"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_itineraries_cost"`);

    // Remove cost tracking flag from trips
    await queryRunner.query(`
      ALTER TABLE "trips" DROP COLUMN IF EXISTS "enable_cost_tracking"
    `);

    // Drop new tables
    await queryRunner.query(`DROP TABLE IF EXISTS "budget_tracking"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_costs"`);

    // Remove cost fields from itineraries table
    await queryRunner.query(`
      ALTER TABLE "itineraries" 
      DROP COLUMN IF EXISTS "cost_breakdown",
      DROP COLUMN IF EXISTS "cost_currency",
      DROP COLUMN IF EXISTS "actual_cost",
      DROP COLUMN IF EXISTS "estimated_cost"
    `);
  }
}
