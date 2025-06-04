import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { APIThrottleService } from '../shared/services/api-throttle.service';
import { DatabaseModule } from 'src/database/database.module';
import { SharedModule } from 'src/shared/shared.module';
import { LocationModule } from 'src/location/location.module';

describe('LocationController (Integration)', () => {
  let app: INestApplication;
  let apiThrottleService: APIThrottleService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        DatabaseModule,
        SharedModule,
        LocationModule,
      ],
    })
      .overrideProvider(APIThrottleService)
      .useValue({
        checkAndLog: jest.fn().mockReturnValue(true),
        getUsageStats: jest.fn().mockResolvedValue({
          goong: { used: 0, limit: 1000 },
          geoapify: { used: 0, limit: 1000 },
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    apiThrottleService =
      moduleFixture.get<APIThrottleService>(APIThrottleService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/location/search', () => {
    it('should search for locations successfully', async () => {
      const searchQuery = {
        query: 'Ho Chi Minh City',
        countryCode: 'VN',
        limit: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/location/search')
        .send(searchQuery)
        .expect(200);

      expect(response.body).toHaveProperty('result', 'OK');
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data).toHaveProperty('source');
      expect(response.body.data).toHaveProperty('totalResults');
      expect(Array.isArray(response.body.data.results)).toBe(true);
    });

    it('should validate required fields', async () => {
      const invalidQuery = {
        countryCode: 'VN',
        limit: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/location/search')
        .send(invalidQuery)
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body).toHaveProperty('status', 400);
      expect(response.body.error).toHaveProperty('message');
    });

    it('should validate country code format', async () => {
      const invalidQuery = {
        query: 'Ho Chi Minh City',
        countryCode: 'INVALID',
        limit: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/location/search')
        .send(invalidQuery)
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body.error.message).toContain(
        'Country code must be exactly 2 characters',
      );
    });

    it('should validate limit parameter', async () => {
      const invalidQuery = {
        query: 'Ho Chi Minh City',
        countryCode: 'VN',
        limit: 101,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/location/search')
        .send(invalidQuery)
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body.error.message).toContain(
        'Limit must not be greater than 100',
      );
    });

    it('should handle API rate limiting', async () => {
      // Mock API throttle to return false (rate limited)
      jest.spyOn(apiThrottleService, 'checkAndLog').mockReturnValue(false);

      const searchQuery = {
        query: 'Ho Chi Minh City',
        countryCode: 'VN',
        limit: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/location/search')
        .send(searchQuery)
        .expect(429);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body).toHaveProperty('status', 429);
      expect(response.body.error.message).toContain('rate limit');
    });
  });

  describe('POST /api/v1/location/poi/search', () => {
    it('should search for POI successfully', async () => {
      const poiQuery = {
        latitude: 10.8231,
        longitude: 106.6297,
        radius: 1000,
        categories: ['tourism.attraction'],
        limit: 10,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/location/poi/search')
        .send(poiQuery)
        .expect(200);

      expect(response.body).toHaveProperty('result', 'OK');
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('pois');
      expect(response.body.data).toHaveProperty('source');
      expect(response.body.data).toHaveProperty('totalResults');
      expect(Array.isArray(response.body.data.pois)).toBe(true);
    });

    it('should validate coordinate parameters', async () => {
      const invalidQuery = {
        latitude: 91, // Invalid latitude
        longitude: 106.6297,
        radius: 1000,
        limit: 10,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/location/poi/search')
        .send(invalidQuery)
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body.error.message).toContain(
        'Latitude must be between -90 and 90',
      );
    });

    it('should validate radius parameter', async () => {
      const invalidQuery = {
        latitude: 10.8231,
        longitude: 106.6297,
        radius: 50001, // Too large radius
        limit: 10,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/location/poi/search')
        .send(invalidQuery)
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body.error.message).toContain(
        'Radius must not be greater than 50000',
      );
    });

    it('should validate POI categories', async () => {
      const invalidQuery = {
        latitude: 10.8231,
        longitude: 106.6297,
        radius: 1000,
        categories: ['invalid.category'],
        limit: 10,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/location/poi/search')
        .send(invalidQuery)
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body.error.message).toContain('category');
    });
  });

  describe('GET /api/v1/location/suggestions/:countryCode', () => {
    it('should get location suggestions for Vietnam', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/location/suggestions/VN')
        .query({ limit: 5 })
        .expect(200);

      expect(response.body).toHaveProperty('result', 'OK');
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should validate country code parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/location/suggestions/INVALID')
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body.error.message).toContain(
        'Country code must be exactly 2 characters',
      );
    });

    it('should validate limit query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/location/suggestions/VN')
        .query({ limit: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
    });
  });

  describe('POST /api/v1/location/weather/current', () => {
    it('should get current weather successfully', async () => {
      const weatherQuery = {
        latitude: 10.8231,
        longitude: 106.6297,
        units: 'metric',
        language: 'en',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/location/weather/current')
        .send(weatherQuery)
        .expect(200);

      expect(response.body).toHaveProperty('result', 'OK');
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('current');
      expect(response.body.data).toHaveProperty('location');
      expect(response.body.data.current).toHaveProperty('temperature');
      expect(response.body.data.current).toHaveProperty('condition');
    });

    it('should validate weather request parameters', async () => {
      const invalidQuery = {
        latitude: 'invalid',
        longitude: 106.6297,
        units: 'metric',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/location/weather/current')
        .send(invalidQuery)
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body.error.message).toContain('latitude');
    });

    it('should validate weather units parameter', async () => {
      const invalidQuery = {
        latitude: 10.8231,
        longitude: 106.6297,
        units: 'invalid',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/location/weather/current')
        .send(invalidQuery)
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body.error.message).toContain('units must be one of');
    });

    it('should include Vietnam insights for VN coordinates', async () => {
      const vietnamWeatherQuery = {
        latitude: 21.0285, // Hanoi
        longitude: 105.8542,
        units: 'metric',
        language: 'en',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/location/weather/current')
        .send(vietnamWeatherQuery)
        .expect(200);

      expect(response.body.data).toHaveProperty('vietnamInsights');
      expect(response.body.data.vietnamInsights).toHaveProperty('season');
      expect(response.body.data.vietnamInsights).toHaveProperty(
        'travelRecommendations',
      );
      expect(response.body.data.vietnamInsights).toHaveProperty(
        'clothingAdvice',
      );
    });
  });

  describe('POST /api/v1/location/weather/forecast', () => {
    it('should get weather forecast successfully', async () => {
      const forecastQuery = {
        latitude: 10.8231,
        longitude: 106.6297,
        units: 'metric',
        language: 'en',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/location/weather/forecast')
        .send(forecastQuery)
        .expect(200);

      expect(response.body).toHaveProperty('result', 'OK');
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('forecast');
      expect(response.body.data).toHaveProperty('location');
      expect(Array.isArray(response.body.data.forecast)).toBe(true);
    });

    it('should validate forecast request parameters', async () => {
      const invalidQuery = {
        latitude: 91, // Invalid latitude
        longitude: 106.6297,
        units: 'metric',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/location/weather/forecast')
        .send(invalidQuery)
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body.error.message).toContain(
        'Latitude must be between -90 and 90',
      );
    });
  });

  describe('Error handling', () => {
    it('should handle internal server errors gracefully', async () => {
      // This test would require mocking the service to throw an error
      // Implementation depends on specific error scenarios to test
    });

    it('should return consistent error format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/location/search')
        .send({}) // Invalid request
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body).toHaveProperty('status', 400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timestamp');
    });
  });

  describe('Response format validation', () => {
    it('should return responses in correct format', async () => {
      const searchQuery = {
        query: 'Ho Chi Minh City',
        countryCode: 'VN',
        limit: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/location/search')
        .send(searchQuery)
        .expect(200);

      // Validate response structure
      expect(response.body).toMatchObject({
        result: 'OK',
        status: 200,
        data: expect.any(Object),
        meta: {
          timestamp: expect.any(String),
        },
      });

      // Validate data structure
      expect(response.body.data).toMatchObject({
        results: expect.any(Array),
        source: expect.any(String),
        totalResults: expect.any(Number),
      });
    });
  });
});
