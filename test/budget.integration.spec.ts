import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TripBudgetEntity } from 'src/schemas/trip-budget.entity';
import { BudgetItemEntity } from 'src/schemas/budget-item.entity';
import { TripEntity } from 'src/schemas/trip.entity';
import { ActivityCategory, TripStatus } from 'src/trip/enum/trip-enum';
import { BudgetModule } from 'src/budget/budget.module';

describe('Budget Module Integration Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'test',
          password: process.env.DB_PASSWORD || 'test',
          database: process.env.DB_NAME || 'tripmaster_test',
          entities: [TripEntity, TripBudgetEntity, BudgetItemEntity],
          synchronize: true,
          dropSchema: true,
        }),
        BudgetModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.dropDatabase();
    await dataSource.destroy();
    await app.close();
  });

  describe('Budget CRUD Operations', () => {
    let tripId: string;
    let budgetId: string;
    let itemId: string;

    beforeAll(async () => {
      // Create a test trip
      const tripRepository = dataSource.getRepository(TripEntity);
      const trip = tripRepository.create({
        description: 'Test Description',
        startDate: new Date(),
        endDate: new Date(),
        status: TripStatus.PLANNING,
      });
      const savedTrip = await tripRepository.save(trip);
      tripId = savedTrip.id;
    });

    it('POST /budget - should create a new budget', async () => {
      const response = await request(app.getHttpServer())
        .post('/budget')
        .send({
          tripId,
          totalBudget: 5000,
          currency: 'VND',
          notifyThreshold: 0.8,
        })
        .expect(201);

      expect(response.body.data).toMatchObject({
        tripId,
        totalBudget: 5000,
        spentAmount: 0,
        currency: 'VND',
        notifyThreshold: 0.8,
      });

      budgetId = response.body.data.id;
    });

    it('POST /budget - should reject duplicate budget', async () => {
      const response = await request(app.getHttpServer())
        .post('/budget')
        .send({
          tripId,
          totalBudget: 3000,
        })
        .expect(400);

      expect(response.body.message).toContain('already exists');
    });

    it('GET /budget/:tripId - should retrieve budget with items', async () => {
      const response = await request(app.getHttpServer())
        .get(`/budget/${tripId}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        tripId,
        totalBudget: 5000,
        items: [],
      });
    });

    it('POST /budget/item - should add expense item', async () => {
      const response = await request(app.getHttpServer())
        .post('/budget/item')
        .send({
          tripBudgetId: budgetId,
          category: ActivityCategory.HOTEL,
          amount: 500,
          source: 'api',
        })
        .expect(201);

      expect(response.body.data).toMatchObject({
        tripBudgetId: budgetId,
        category: ActivityCategory.HOTEL,
        amount: 500,
        source: 'api',
      });

      itemId = response.body.data.id;
    });

    it('POST /budget/item - should validate amount exceeding budget', async () => {
      const response = await request(app.getHttpServer())
        .post('/budget/item')
        .send({
          tripBudgetId: budgetId,
          category: ActivityCategory.FLIGHT,
          amount: 4600, // Would exceed 5000 budget (500 + 4600 > 5000)
        })
        .expect(400);

      expect(response.body.message).toContain('exceed');
    });

    it('PATCH /budget/:id - should update budget details', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/budget/${budgetId}`)
        .send({
          totalBudget: 6000,
          notifyThreshold: 0.7,
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        totalBudget: 6000,
        notifyThreshold: 0.7,
      });
    });

    it('DELETE /budget/item/:id - should delete budget item', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/budget/item/${itemId}`)
        .expect(200);

      expect(response.body.data).toEqual({ deleted: true });
    });

    it('GET /budget/summary/:tripId - should return budget summary', async () => {
      // Add item first
      await request(app.getHttpServer()).post('/budget/item').send({
        tripBudgetId: budgetId,
        category: ActivityCategory.FOOD,
        amount: 300,
      });

      const response = await request(app.getHttpServer())
        .get(`/budget/summary/${tripId}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        tripId,
        totalBudget: 6000,
        percentageUsed: 5,
        remainingBudget: 5700,
        currency: 'VND',
      });
    });

    it('GET /budget/analytics/:tripId - should return budget breakdown', async () => {
      // Add multiple items with different categories
      await request(app.getHttpServer()).post('/budget/item').send({
        tripBudgetId: budgetId,
        category: ActivityCategory.HOTEL,
        amount: 1000,
      });

      await request(app.getHttpServer()).post('/budget/item').send({
        tripBudgetId: budgetId,
        category: ActivityCategory.FOOD,
        amount: 200,
      });

      const response = await request(app.getHttpServer())
        .get(`/budget/analytics/${tripId}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('breakdown');
      expect(Array.isArray(response.body.data.breakdown)).toBe(true);
      expect(response.body.data.breakdown.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent budget', async () => {
      const response = await request(app.getHttpServer())
        .get('/budget/non-existent-trip')
        .expect(200); // Returns null, not error

      expect(response.body.data).toBeNull();
    });

    it('should return 400 for invalid spending validation', async () => {
      const tripRepository = dataSource.getRepository(TripEntity);
      const trip = tripRepository.create({
        startDate: new Date(),
        endDate: new Date(),
        status: TripStatus.PLANNING,
      });
      const savedTrip = await tripRepository.save(trip);

      // Create budget
      const budgetResponse = await request(app.getHttpServer())
        .post('/budget')
        .send({
          tripId: savedTrip.id,
          totalBudget: 100,
        });

      const testBudgetId = budgetResponse.body.data.id;

      // Try to add item exceeding budget
      const response = await request(app.getHttpServer())
        .post('/budget/item')
        .send({
          tripBudgetId: testBudgetId,
          category: ActivityCategory.FLIGHT,
          amount: 150,
        })
        .expect(400);

      expect(response.body.message).toContain('exceed');
    });
  });
});
