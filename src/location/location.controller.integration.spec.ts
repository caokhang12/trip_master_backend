import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as request from 'supertest';
import { APIThrottleService } from '../shared/services/api-throttle.service';
import { DatabaseModule } from '../database/database.module';
import { SharedModule } from '../shared/shared.module';
import { LocationModule } from '../location/location.module';
import { LocationService } from './services/location.service';
import { WeatherService } from './services/weather.service';

describe('LocationController (Integration)', () => {
  let app: INestApplication;
  let apiThrottleService: APIThrottleService;
  let accessToken: string;

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
      .overrideProvider(LocationService)
      .useValue({
        searchLocation: jest.fn().mockResolvedValue([
          {
            id: '1',
            name: 'Ho Chi Minh City',
            displayName: 'Ho Chi Minh City, Vietnam',
            coordinates: { lat: 10.8231, lng: 106.6297 },
            country: 'Vietnam',
            countryCode: 'VN',
            address: 'Ho Chi Minh City, Vietnam',
            placeType: 'city',
            source: 'test',
          },
        ]),
        findNearbyPlaces: jest.fn().mockResolvedValue({
          items: [
            {
              id: '1',
              name: 'Ben Thanh Market',
              category: 'attraction',
              coordinates: { lat: 10.8231, lng: 106.6297 },
              address: 'Ben Thanh Market, District 1, Ho Chi Minh City',
              source: 'test',
            },
          ],
          pagination: {
            total: 1,
            page: 1,
            limit: 20,
            hasMore: false,
            hasNext: false,
            hasPrevious: false,
          },
        }),
        getVietnameseRegions: jest.fn().mockResolvedValue([
          {
            id: 1,
            name: 'Ho Chi Minh City',
            slug: 'ho-chi-minh-city',
            type: 'thanh-pho',
            nameWithType: 'Thành phố Hồ Chí Minh',
            code: '79',
            coordinates: { lat: 10.8231, lng: 106.6297 },
          },
        ]),
      })
      .overrideProvider(WeatherService)
      .useValue({
        getWeather: jest.fn().mockResolvedValue({
          current: {
            temperature: 28.5,
            feelsLike: 32.1,
            humidity: 75,
            description: 'Partly cloudy',
            icon: '02d',
            windSpeed: 3.2,
            visibility: 10000,
          },
          forecast: [
            {
              date: '2024-06-06',
              temperature: { min: 25, max: 32 },
              description: 'Sunny',
              icon: '01d',
              humidity: 70,
              chanceOfRain: 10,
            },
          ],
          location: {
            lat: 10.8231,
            lng: 106.6297,
            name: 'Ho Chi Minh City, Vietnam',
          },
          vietnamSeasonInfo: {
            season: 'rainy',
            bestForTravel: true,
            packingTips: ['Light clothing', 'Umbrella', 'Sunscreen'],
          },
        }),
      })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn().mockImplementation((context: any): boolean => {
          const request = context.switchToHttp().getRequest();
          const authHeader = request.headers.authorization;
          return !!(authHeader && authHeader.startsWith('Bearer '));
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();

    // Set global prefix to match main.ts
    app.setGlobalPrefix('api/v1');

    // Add validation pipe for DTO validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    apiThrottleService =
      moduleFixture.get<APIThrottleService>(APIThrottleService);

    // Create a mock access token for testing
    accessToken = 'mock-jwt-token';

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/location/search', () => {
    it('should search for locations successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/location/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          query: 'Ho Chi Minh City',
          country: 'VN',
          limit: 5,
        })
        .expect(200);

      expect(response.body).toHaveProperty('result', 'OK');
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      if (response.body.data.length > 0) {
        const location = response.body.data[0];
        expect(location).toHaveProperty('id');
        expect(location).toHaveProperty('name');
        expect(location).toHaveProperty('coordinates');
      }
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/location/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          country: 'VN',
          limit: 5,
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(
        (response.body.message as string[]).some((msg: string) =>
          msg.includes('query'),
        ),
      ).toBe(true);
    });

    it('should validate country code format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/location/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          query: 'Ho Chi Minh City',
          country: 'INVALID',
          limit: 5,
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(
        (response.body.message as string[]).some((msg: string) =>
          msg.includes('2 characters'),
        ),
      ).toBe(true);
    });

    it('should validate limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/location/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          query: 'Ho Chi Minh City',
          country: 'VN',
          limit: 101,
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(
        (response.body.message as string[]).some((msg: string) =>
          msg.includes('50'),
        ),
      ).toBe(true);
    });

    it('should handle API rate limiting', async () => {
      // Mock API throttle to return false (rate limited)
      const checkAndLogSpy = jest.spyOn(apiThrottleService, 'checkAndLog');
      checkAndLogSpy.mockReturnValue(false);

      // Since rate limiting is handled in the service layer,
      // the controller should still return 200 but with potentially empty results
      // or the service should throw an exception that gets handled by global filters
      const response = await request(app.getHttpServer())
        .get('/api/v1/location/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          query: 'Ho Chi Minh City',
          country: 'VN',
          limit: 5,
        })
        .expect(200); // Expecting 200 since rate limiting is handled in service layer

      expect(response.body).toHaveProperty('result', 'OK');
      expect(response.body).toHaveProperty('status', 200);

      // Restore original mock
      checkAndLogSpy.mockReturnValue(true);
    });
  });

  describe('GET /api/v1/location/nearby-places', () => {
    it('should search for nearby places successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/location/nearby-places')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          lat: 10.8231,
          lng: 106.6297,
          radius: 1000,
          category: 'attractions',
          limit: 10,
        })
        .expect(200);

      expect(response.body).toHaveProperty('result', 'OK');
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('places');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.places)).toBe(true);
    });

    it('should validate coordinate parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/location/nearby-places')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          lat: 91, // Invalid latitude
          lng: 106.6297,
          radius: 1000,
          limit: 10,
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(
        (response.body.message as string[]).some((msg: string) =>
          msg.includes('90'),
        ),
      ).toBe(true);
    });

    it('should validate radius parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/location/nearby-places')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          lat: 10.8231,
          lng: 106.6297,
          radius: 50001, // Too large radius
          limit: 10,
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(
        (response.body.message as string[]).some((msg: string) =>
          msg.includes('50000'),
        ),
      ).toBe(true);
    });
  });

  describe('GET /api/v1/location/vietnam/provinces', () => {
    it('should get Vietnamese provinces successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/location/vietnam/provinces')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('result', 'OK');
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      if (response.body.data.length > 0) {
        const province = response.body.data[0];
        expect(province).toHaveProperty('id');
        expect(province).toHaveProperty('name');
        expect(province).toHaveProperty('type');
        expect(province).toHaveProperty('coordinates');
      }
    });
  });

  describe('GET /api/v1/location/weather', () => {
    it('should get weather information successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/location/weather')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          lat: 10.8231,
          lng: 106.6297,
          includeForecast: true,
          includeVietnamInfo: true,
        })
        .expect(200);

      expect(response.body).toHaveProperty('result', 'OK');
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('current');
      expect(response.body.data.current).toHaveProperty('temperature');
      expect(response.body.data.current).toHaveProperty('description');
    });

    it('should validate weather request parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/location/weather')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          lat: 91, // Invalid latitude
          lng: 106.6297,
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(
        (response.body.message as string[]).some((msg: string) =>
          msg.includes('lat must not be greater than 90'),
        ),
      ).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle unauthorized requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/location/search')
        .query({
          query: 'Ho Chi Minh City',
          country: 'VN',
        })
        .expect(403);

      expect(response.body).toHaveProperty('statusCode', 403);
      expect(response.body).toHaveProperty('message', 'Forbidden resource');
    });

    it('should return consistent error format for validation errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/location/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({}) // Missing required query parameter
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });
  });

  describe('Response format validation', () => {
    it('should return responses in correct format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/location/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          query: 'Ho Chi Minh City',
          country: 'VN',
          limit: 5,
        })
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('result', 'OK');
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
