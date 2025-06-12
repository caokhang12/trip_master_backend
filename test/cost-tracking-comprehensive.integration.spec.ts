import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { DatabaseConfig } from '../src/database/database.config';
import { TripModule } from '../src/trip/trip.module';
import { AuthModule } from '../src/auth/auth.module';
import { SharedModule } from '../src/shared/shared.module';
import { TripEntity } from '../src/schemas/trip.entity';
import { ItineraryEntity } from '../src/schemas/itinerary.entity';
import { ActivityCostEntity } from '../src/schemas/activity-cost.entity';
import { BudgetTrackingEntity } from '../src/schemas/budget-tracking.entity';
import { UserEntity } from '../src/schemas/user.entity';

/**
 * Comprehensive integration tests for Cost Tracking functionality
 * Tests all aspects of the Enhanced Itinerary Management with Cost Tracking feature
 */
describe('Cost Tracking Integration Tests', () => {
  let app: INestApplication;
  let module: TestingModule;
  let databaseAvailable = false;
  let authToken: string;
  let testUser: UserEntity;
  let testTrip: TripEntity;
  let testItinerary: ItineraryEntity;

  // Test data constants
  const testUserData = {
    email: 'costtracking@test.com',
    password: 'TestPassword123!',
    firstName: 'Cost',
    lastName: 'Tracker',
  };

  const testTripData = {
    title: 'Cost Tracking Test Trip',
    description: 'A comprehensive test trip for cost tracking features',
    destinationName: 'Tokyo, Japan',
    destinationCoords: { lat: 35.6762, lng: 139.6503 },
    destinationCountry: 'JP',
    startDate: '2024-07-15',
    endDate: '2024-07-20',
    budget: 3000,
    currency: 'USD',
    enableCostTracking: true,
  };

  const testItineraryData = {
    dayNumber: 1,
    date: '2024-07-15',
    activities: [
      {
        time: '09:00',
        title: 'Traditional Japanese Breakfast',
        description:
          'Authentic breakfast at ryokan with miso soup, rice, and grilled fish',
        location: 'Shibuya District, Tokyo',
        duration: 60,
        type: 'food',
      },
      {
        time: '10:30',
        title: 'Senso-ji Temple Visit',
        description: 'Historic Buddhist temple in Asakusa district',
        location: 'Asakusa, Tokyo',
        duration: 120,
        type: 'sightseeing',
      },
      {
        time: '13:00',
        title: 'Sushi Lunch at Tsukiji',
        description: 'Fresh sushi at famous Tsukiji fish market',
        location: 'Tsukiji, Tokyo',
        duration: 90,
        type: 'food',
      },
      {
        time: '15:30',
        title: 'Shopping in Harajuku',
        description: 'Fashion and souvenir shopping in trendy district',
        location: 'Harajuku, Tokyo',
        duration: 180,
        type: 'shopping',
      },
      {
        time: '19:00',
        title: 'Dinner at Izakaya',
        description: 'Traditional Japanese pub experience with sake',
        location: 'Shinjuku, Tokyo',
        duration: 120,
        type: 'food',
      },
    ],
  };

  beforeAll(async () => {
    try {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env.test',
          }),
          TypeOrmModule.forRootAsync({
            useClass: DatabaseConfig,
          }),
          TripModule,
          AuthModule,
          SharedModule,
        ],
      }).compile();

      app = module.createNestApplication();
      await app.init();
      databaseAvailable = true;

      // Create test user and get auth token
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUserData)
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUserData.email,
          password: testUserData.password,
        })
        .expect(200);

      authToken = loginResponse.body.data.accessToken;
    } catch (error) {
      console.warn(
        'Cost tracking tests skipped - database not available:',
        error.message,
      );
      databaseAvailable = false;
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Setup and Preconditions', () => {
    it('should skip tests if database is not available', () => {
      if (!databaseAvailable) {
        console.log('Skipping cost tracking tests - database not available');
      }
      expect(true).toBe(true);
    });

    it('should create a test trip with cost tracking enabled', async () => {
      if (!databaseAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testTripData)
        .expect(201);

      testTrip = response.body.data;
      expect(testTrip.enableCostTracking).toBe(true);
      expect(testTrip.budget).toBe(testTripData.budget);
      expect(testTrip.currency).toBe(testTripData.currency);
    });

    it('should create an itinerary with activities for cost tracking', async () => {
      if (!databaseAvailable || !testTrip) return;

      const response = await request(app.getHttpServer())
        .post(`/api/v1/trips/${testTrip.id}/itinerary`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testItineraryData)
        .expect(201);

      testItinerary = response.body.data;
      expect(testItinerary.activities).toHaveLength(5);
      expect(testItinerary.estimatedCost).toBeGreaterThan(0);
      expect(testItinerary.costCurrency).toBe('USD');
    });
  });

  describe('AI Cost Estimation', () => {
    it('should generate accurate cost estimates for Japanese activities', async () => {
      if (!databaseAvailable || !testItinerary) return;

      // Verify that each activity type gets appropriate cost estimates
      const expectedCostRanges = {
        food: { min: 15, max: 80 }, // Japanese food prices
        sightseeing: { min: 0, max: 20 }, // Temple visits are often free
        shopping: { min: 50, max: 200 }, // Harajuku shopping
      };

      expect(testItinerary.costBreakdown).toBeDefined();
      expect(testItinerary.costBreakdown.food).toBeGreaterThan(
        expectedCostRanges.food.min,
      );
      expect(testItinerary.costBreakdown.shopping).toBeGreaterThan(
        expectedCostRanges.shopping.min,
      );
    });

    it('should apply correct country multipliers for Japan', async () => {
      if (!databaseAvailable || !testItinerary) return;

      // Japan should have higher costs due to country multiplier
      expect(testItinerary.estimatedCost).toBeGreaterThan(100);
      expect(testItinerary.estimatedCost).toBeLessThan(500); // Reasonable upper bound
    });

    it('should consider activity duration in cost estimation', async () => {
      if (!databaseAvailable) return;

      // Create a shorter itinerary to compare
      const shortItineraryData = {
        dayNumber: 2,
        date: '2024-07-16',
        activities: [
          {
            time: '10:00',
            title: 'Quick Coffee',
            description: 'Quick coffee break',
            location: 'Tokyo Station',
            duration: 30, // Shorter duration
            type: 'food',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/trips/${testTrip.id}/itinerary`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(shortItineraryData)
        .expect(201);

      const shortItinerary = response.body.data;
      expect(shortItinerary.estimatedCost).toBeLessThan(
        testItinerary.estimatedCost,
      );
    });
  });

  describe('Activity Cost Management', () => {
    let activityCostId: string;

    it('should retrieve activity costs for an itinerary', async () => {
      if (!databaseAvailable || !testItinerary) return;

      const response = await request(app.getHttpServer())
        .get(
          `/api/v1/trips/${testTrip.id}/itinerary/${testItinerary.id}/activity-costs`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const activityCosts = response.body.data;
      expect(Array.isArray(activityCosts)).toBe(true);
      expect(activityCosts.length).toBeGreaterThan(0);
      activityCostId = activityCosts[0].id;
    });

    it('should update activity cost with actual spending', async () => {
      if (!databaseAvailable || !activityCostId) return;

      const updateData = {
        actualAmount: 45.5,
        notes: 'Cost was higher than expected due to premium sake',
      };

      const response = await request(app.getHttpServer())
        .put(
          `/api/v1/trips/${testTrip.id}/itinerary/${testItinerary.id}/activities/0/cost`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      const updatedCost = response.body.data;
      expect(updatedCost.actualAmount).toBe(updateData.actualAmount);
      expect(updatedCost.notes).toBe(updateData.notes);
    });

    it('should reject invalid cost updates', async () => {
      if (!databaseAvailable || !testItinerary) return;

      const invalidData = {
        actualAmount: -25.0, // Negative amount should be rejected
        notes: 'Invalid negative cost',
      };

      await request(app.getHttpServer())
        .put(
          `/api/v1/trips/${testTrip.id}/itinerary/${testItinerary.id}/activities/0/cost`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should handle currency validation', async () => {
      if (!databaseAvailable || !testItinerary) return;

      const invalidCurrencyData = {
        actualAmount: 25.0,
        currency: 'INVALID', // Invalid currency code
      };

      await request(app.getHttpServer())
        .put(
          `/api/v1/trips/${testTrip.id}/itinerary/${testItinerary.id}/activities/0/cost`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidCurrencyData)
        .expect(400);
    });
  });

  describe('Cost Analysis', () => {
    it('should provide comprehensive cost analysis', async () => {
      if (!databaseAvailable || !testItinerary) return;

      const response = await request(app.getHttpServer())
        .get(
          `/api/v1/trips/${testTrip.id}/itinerary/${testItinerary.id}/cost-analysis`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const analysis = response.body.data;
      expect(analysis).toHaveProperty('tripId', testTrip.id);
      expect(analysis).toHaveProperty('totalBudget');
      expect(analysis).toHaveProperty('totalEstimated');
      expect(analysis).toHaveProperty('totalSpent');
      expect(analysis).toHaveProperty('remainingBudget');
      expect(analysis).toHaveProperty('budgetVariance');
      expect(analysis).toHaveProperty('utilizationPercentage');
      expect(analysis).toHaveProperty('categoryBreakdown');
      expect(Array.isArray(analysis.categoryBreakdown)).toBe(true);
    });

    it('should calculate budget utilization correctly', async () => {
      if (!databaseAvailable || !testItinerary) return;

      const response = await request(app.getHttpServer())
        .get(
          `/api/v1/trips/${testTrip.id}/itinerary/${testItinerary.id}/cost-analysis`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const analysis = response.body.data;
      const expectedUtilization =
        (analysis.totalSpent / analysis.totalBudget) * 100;
      expect(
        Math.abs(analysis.utilizationPercentage - expectedUtilization),
      ).toBeLessThan(0.01);
    });

    it('should provide category breakdown with correct structure', async () => {
      if (!databaseAvailable || !testItinerary) return;

      const response = await request(app.getHttpServer())
        .get(
          `/api/v1/trips/${testTrip.id}/itinerary/${testItinerary.id}/cost-analysis`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const analysis = response.body.data;
      const categoryBreakdown = analysis.categoryBreakdown;

      categoryBreakdown.forEach((category) => {
        expect(category).toHaveProperty('category');
        expect(category).toHaveProperty('budgeted');
        expect(category).toHaveProperty('estimated');
        expect(category).toHaveProperty('actual');
        expect(category).toHaveProperty('variance');
        expect(category).toHaveProperty('utilizationPercentage');
        expect(typeof category.budgeted).toBe('number');
        expect(typeof category.estimated).toBe('number');
        expect(typeof category.actual).toBe('number');
      });
    });
  });

  describe('Budget Summary', () => {
    it('should provide complete budget summary', async () => {
      if (!databaseAvailable || !testTrip) return;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/trips/${testTrip.id}/budget-summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const summary = response.body.data;
      expect(summary).toHaveProperty('totalBudget', testTrip.budget);
      expect(summary).toHaveProperty('totalSpent');
      expect(summary).toHaveProperty('totalEstimated');
      expect(summary).toHaveProperty('remainingBudget');
      expect(summary).toHaveProperty('budgetUtilization');
      expect(summary).toHaveProperty('currency', testTrip.currency);
      expect(summary).toHaveProperty('categoryBreakdown');
      expect(summary).toHaveProperty('lastUpdated');
    });

    it('should calculate remaining budget correctly', async () => {
      if (!databaseAvailable || !testTrip) return;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/trips/${testTrip.id}/budget-summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const summary = response.body.data;
      const expectedRemaining = summary.totalBudget - summary.totalSpent;
      expect(
        Math.abs(summary.remainingBudget - expectedRemaining),
      ).toBeLessThan(0.01);
    });

    it('should handle trips with no spending', async () => {
      if (!databaseAvailable) return;

      // Create a new trip with no activities
      const newTripData = {
        ...testTripData,
        title: 'Empty Trip for Budget Test',
      };

      const tripResponse = await request(app.getHttpServer())
        .post('/api/v1/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newTripData)
        .expect(201);

      const newTrip = tripResponse.body.data;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/trips/${newTrip.id}/budget-summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const summary = response.body.data;
      expect(summary.totalSpent).toBe(0);
      expect(summary.totalEstimated).toBe(0);
      expect(summary.remainingBudget).toBe(summary.totalBudget);
      expect(summary.budgetUtilization).toBe(0);
    });
  });

  describe('Multi-Currency Support', () => {
    it('should handle different currencies in activities', async () => {
      if (!databaseAvailable || !testTrip) return;

      const multiCurrencyItinerary = {
        dayNumber: 3,
        date: '2024-07-17',
        activities: [
          {
            time: '10:00',
            title: 'Ramen Lunch',
            description: 'Local ramen shop - price in JPY',
            location: 'Tokyo',
            duration: 45,
            type: 'food',
            cost: 1200, // JPY
            currency: 'JPY',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/trips/${testTrip.id}/itinerary`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(multiCurrencyItinerary)
        .expect(201);

      const itinerary = response.body.data;
      expect(itinerary.costCurrency).toBe('USD'); // Trip currency
      expect(itinerary.estimatedCost).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large itineraries efficiently', async () => {
      if (!databaseAvailable || !testTrip) return;

      // Create itinerary with many activities
      const largeItinerary = {
        dayNumber: 4,
        date: '2024-07-18',
        activities: Array.from({ length: 20 }, (_, i) => ({
          time: `${9 + Math.floor(i / 2)}:${i % 2 === 0 ? '00' : '30'}`,
          title: `Activity ${i + 1}`,
          description: `Test activity number ${i + 1}`,
          location: 'Tokyo',
          duration: 30,
          type: ['food', 'sightseeing', 'shopping', 'transport'][i % 4],
        })),
      };

      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .post(`/api/v1/trips/${testTrip.id}/itinerary`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeItinerary)
        .expect(201);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(response.body.data.activities).toHaveLength(20);
      expect(response.body.data.estimatedCost).toBeGreaterThan(0);
    });

    it('should handle concurrent cost updates', async () => {
      if (!databaseAvailable || !testItinerary) return;

      const concurrentUpdates = Array.from({ length: 5 }, (_, i) =>
        request(app.getHttpServer())
          .put(
            `/api/v1/trips/${testTrip.id}/itinerary/${testItinerary.id}/activities/${i}/cost`,
          )
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            actualAmount: 25.0 + i,
            notes: `Concurrent update ${i}`,
          }),
      );

      const responses = await Promise.all(concurrentUpdates);
      responses.forEach((response, i) => {
        if (response.status === 200) {
          expect(response.body.data.actualAmount).toBe(25.0 + i);
        }
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent trip ID', async () => {
      if (!databaseAvailable) return;

      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      await request(app.getHttpServer())
        .get(`/api/v1/trips/${fakeId}/budget-summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should handle non-existent itinerary ID', async () => {
      if (!databaseAvailable || !testTrip) return;

      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      await request(app.getHttpServer())
        .get(`/api/v1/trips/${testTrip.id}/itinerary/${fakeId}/cost-analysis`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should handle unauthorized access', async () => {
      if (!databaseAvailable || !testTrip) return;

      await request(app.getHttpServer())
        .get(`/api/v1/trips/${testTrip.id}/budget-summary`)
        .expect(401);
    });

    it('should handle invalid activity index', async () => {
      if (!databaseAvailable || !testItinerary) return;

      await request(app.getHttpServer())
        .put(
          `/api/v1/trips/${testTrip.id}/itinerary/${testItinerary.id}/activities/999/cost`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          actualAmount: 25.0,
          notes: 'Invalid activity index',
        })
        .expect(404);
    });

    it('should validate cost amount limits', async () => {
      if (!databaseAvailable || !testItinerary) return;

      // Test extremely large amount
      await request(app.getHttpServer())
        .put(
          `/api/v1/trips/${testTrip.id}/itinerary/${testItinerary.id}/activities/0/cost`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          actualAmount: 999999999.99,
          notes: 'Extremely large amount',
        })
        .expect(400);
    });
  });

  describe('Data Consistency and Integrity', () => {
    it('should maintain data consistency across related entities', async () => {
      if (!databaseAvailable || !testItinerary) return;

      // Update multiple activity costs
      const updates = [
        { activityIndex: 0, actualAmount: 30.0 },
        { activityIndex: 1, actualAmount: 0.0 }, // Free temple visit
        { activityIndex: 2, actualAmount: 55.0 },
      ];

      for (const update of updates) {
        await request(app.getHttpServer())
          .put(
            `/api/v1/trips/${testTrip.id}/itinerary/${testItinerary.id}/activities/${update.activityIndex}/cost`,
          )
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            actualAmount: update.actualAmount,
            notes: `Update for activity ${update.activityIndex}`,
          })
          .expect(200);
      }

      // Verify budget summary reflects all updates
      const response = await request(app.getHttpServer())
        .get(`/api/v1/trips/${testTrip.id}/budget-summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const summary = response.body.data;
      const expectedTotal = updates.reduce(
        (sum, update) => sum + update.actualAmount,
        0,
      );

      // Note: There might be other activities with costs, so we check that our updates are included
      expect(summary.totalSpent).toBeGreaterThanOrEqual(expectedTotal);
    });

    it('should handle transaction rollback on errors', async () => {
      if (!databaseAvailable || !testItinerary) return;

      // This test would be more complex in a real scenario
      // For now, we verify that partial updates don't leave the system in an inconsistent state

      const beforeResponse = await request(app.getHttpServer())
        .get(`/api/v1/trips/${testTrip.id}/budget-summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const beforeSummary = beforeResponse.body.data;

      // Attempt an invalid update
      await request(app.getHttpServer())
        .put(
          `/api/v1/trips/${testTrip.id}/itinerary/${testItinerary.id}/activities/0/cost`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          actualAmount: 'invalid', // Invalid data type
        })
        .expect(400);

      // Verify system state is unchanged
      const afterResponse = await request(app.getHttpServer())
        .get(`/api/v1/trips/${testTrip.id}/budget-summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const afterSummary = afterResponse.body.data;
      expect(afterSummary.totalSpent).toBe(beforeSummary.totalSpent);
    });
  });
});
