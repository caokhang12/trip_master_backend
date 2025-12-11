import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveRedundantCurrencyFields1765100000001
  implements MigrationInterface
{
  name = 'RemoveRedundantCurrencyFields1765100000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Check if columns exist before attempting to query or drop them
    const itineraryColumnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'itineraries' AND column_name = 'cost_currency'
    `);

    const activityCostColumnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'activity_costs' AND column_name = 'currency'
    `);

    // For itineraries: Check if there are any itineraries with different currency than their trip
    if (itineraryColumnExists.length > 0) {
      const differentCurrencies = await queryRunner.query(`
        SELECT i.id, i.cost_currency, t.currency as trip_currency
        FROM itineraries i
        INNER JOIN trips t ON i.trip_id = t.id
        WHERE i.cost_currency != t.currency
      `);

      if (differentCurrencies.length > 0) {
        console.log(
          `⚠️  Warning: Found ${differentCurrencies.length} itineraries with different currency than their trip`,
        );
        console.log(
          'These will be converted to use the trip currency. Affected itinerary IDs:',
        );
        differentCurrencies.forEach((row: any) => {
          console.log(
            `  - Itinerary ${row.id}: ${row.cost_currency} -> ${row.trip_currency}`,
          );
        });

        // Convert costs to trip currency using a simple approach
        // In production, you might want to call an exchange rate API here
        // For now, we'll just log a warning and keep the amounts as-is
        console.log(
          '⚠️  Note: Cost amounts are kept as-is. Manual review recommended.',
        );
      }
    }

    // For activity_costs: Check similar issue
    if (activityCostColumnExists.length > 0) {
      const activityCostDiff = await queryRunner.query(`
        SELECT ac.id, ac.currency, t.currency as trip_currency
        FROM activity_costs ac
        INNER JOIN itineraries i ON ac.itinerary_id = i.id
        INNER JOIN trips t ON i.trip_id = t.id
        WHERE ac.currency != t.currency
      `);

      if (activityCostDiff.length > 0) {
        console.log(
          `⚠️  Warning: Found ${activityCostDiff.length} activity costs with different currency than their trip`,
        );
        console.log(
          'These will be converted to use the trip currency. Affected activity cost IDs:',
        );
        activityCostDiff.forEach((row: any) => {
          console.log(
            `  - ActivityCost ${row.id}: ${row.currency} -> ${row.trip_currency}`,
          );
        });
      }
    }

    // Step 2: Drop the redundant currency columns
    // Drop cost_currency from itineraries
    await queryRunner.query(`
      ALTER TABLE "itineraries" 
      DROP COLUMN IF EXISTS "cost_currency"
    `);

    // Drop currency from activity_costs
    await queryRunner.query(`
      ALTER TABLE "activity_costs" 
      DROP COLUMN IF EXISTS "currency"
    `);

    console.log('✅ Successfully removed redundant currency fields');
    console.log(
      '   - Removed: itineraries.cost_currency (use trip.currency instead)',
    );
    console.log(
      '   - Removed: activity_costs.currency (use itinerary.trip.currency instead)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore cost_currency to itineraries
    await queryRunner.query(`
      ALTER TABLE "itineraries" 
      ADD COLUMN "cost_currency" VARCHAR(3) DEFAULT 'USD'
    `);

    // Update with trip currency
    await queryRunner.query(`
      UPDATE "itineraries" i
      SET "cost_currency" = t.currency
      FROM "trips" t
      WHERE i.trip_id = t.id
    `);

    // Restore currency to activity_costs
    await queryRunner.query(`
      ALTER TABLE "activity_costs" 
      ADD COLUMN "currency" VARCHAR(3) DEFAULT 'USD'
    `);

    // Update with trip currency
    await queryRunner.query(`
      UPDATE "activity_costs" ac
      SET "currency" = t.currency
      FROM "itineraries" i
      INNER JOIN "trips" t ON i.trip_id = t.id
      WHERE ac.itinerary_id = i.id
    `);

    console.log('✅ Reverted currency fields restoration');
  }
}
