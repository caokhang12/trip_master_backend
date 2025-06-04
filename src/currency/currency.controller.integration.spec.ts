import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { APIThrottleService } from '../shared/services/api-throttle.service';
import { SharedModule } from 'src/shared/shared.module';
import { CurrencyModule } from 'src/currency/currency.module';

describe('CurrencyController (Integration)', () => {
  let app: INestApplication;
  let apiThrottleService: APIThrottleService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        SharedModule,
        CurrencyModule,
      ],
    })
      .overrideProvider(APIThrottleService)
      .useValue({
        checkAndLog: jest.fn().mockReturnValue(true),
        getUsageStats: jest.fn().mockResolvedValue({
          exchangeRateApi: { used: 0, limit: 1500 },
          fixer: { used: 0, limit: 100 },
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

  describe('POST /api/v1/currency/convert', () => {
    it('should convert currency successfully', async () => {
      const conversionRequest = {
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'VND',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .send(conversionRequest)
        .expect(200);

      expect(response.body).toHaveProperty('result', 'OK');
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('originalAmount', 100);
      expect(response.body.data).toHaveProperty('convertedAmount');
      expect(response.body.data).toHaveProperty('exchangeRate');
      expect(response.body.data).toHaveProperty('fromCurrency', 'USD');
      expect(response.body.data).toHaveProperty('toCurrency', 'VND');
      expect(response.body.data).toHaveProperty('formattedAmount');
      expect(response.body.data).toHaveProperty('provider');
      expect(typeof response.body.data.convertedAmount).toBe('number');
      expect(typeof response.body.data.exchangeRate).toBe('number');
    });

    it('should handle same currency conversion', async () => {
      const conversionRequest = {
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'USD',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .send(conversionRequest)
        .expect(200);

      expect(response.body.data.originalAmount).toBe(100);
      expect(response.body.data.convertedAmount).toBe(100);
      expect(response.body.data.exchangeRate).toBe(1);
      expect(response.body.data.provider).toBe('same_currency');
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        fromCurrency: 'USD',
        toCurrency: 'VND',
        // Missing amount
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body).toHaveProperty('status', 400);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('amount');
    });

    it('should validate amount parameter', async () => {
      const invalidRequest = {
        amount: -100, // Negative amount
        fromCurrency: 'USD',
        toCurrency: 'VND',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body.error.message).toContain(
        'Amount must be a positive number',
      );
    });

    it('should validate currency codes', async () => {
      const invalidRequest = {
        amount: 100,
        fromCurrency: 'INVALID',
        toCurrency: 'VND',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body.error.message).toContain(
        'Currency code must be exactly 3 characters',
      );
    });

    it('should handle large amounts', async () => {
      const largeAmountRequest = {
        amount: 1000000,
        fromCurrency: 'USD',
        toCurrency: 'VND',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .send(largeAmountRequest)
        .expect(200);

      expect(response.body.data.originalAmount).toBe(1000000);
      expect(response.body.data.convertedAmount).toBeGreaterThan(0);
      expect(response.body.data.formattedAmount).toContain('₫');
    });

    it('should handle API rate limiting', async () => {
      // Mock API throttle to return false (rate limited)
      jest.spyOn(apiThrottleService, 'checkAndLog').mockReturnValue(false);

      const conversionRequest = {
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'VND',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .send(conversionRequest)
        .expect(429);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body).toHaveProperty('status', 429);
      expect(response.body.error.message).toContain('rate limit');
    });
  });

  describe('GET /api/v1/currency/rates/:baseCurrency', () => {
    it('should get exchange rates successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/rates/USD')
        .expect(200);

      expect(response.body).toHaveProperty('result', 'OK');
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('baseCurrency', 'USD');
      expect(response.body.data).toHaveProperty('rates');
      expect(response.body.data).toHaveProperty('provider');
      expect(response.body.data).toHaveProperty('lastUpdated');
      expect(typeof response.body.data.rates).toBe('object');
    });

    it('should get VND exchange rates with popular pairs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/rates/VND')
        .expect(200);

      expect(response.body.data.baseCurrency).toBe('VND');
      expect(response.body.data).toHaveProperty('popularPairs');
      expect(typeof response.body.data.popularPairs).toBe('object');
    });

    it('should validate currency code parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/rates/INVALID')
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body.error.message).toContain(
        'Currency code must be exactly 3 characters',
      );
    });

    it('should handle case insensitive currency codes', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/rates/usd')
        .expect(200);

      expect(response.body.data.baseCurrency).toBe('USD');
    });

    it('should include major currencies in rates', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/rates/USD')
        .expect(200);

      const rates = response.body.data.rates;
      expect(rates).toHaveProperty('VND');
      expect(rates).toHaveProperty('EUR');
      expect(rates).toHaveProperty('GBP');
      expect(typeof rates.VND).toBe('number');
      expect(typeof rates.EUR).toBe('number');
    });
  });

  describe('GET /api/v1/currency/supported', () => {
    it('should get supported currencies successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/supported')
        .expect(200);

      expect(response.body).toHaveProperty('result', 'OK');
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('currencies');
      expect(response.body.data).toHaveProperty('totalCount');
      expect(Array.isArray(response.body.data.currencies)).toBe(true);
      expect(response.body.data.totalCount).toBeGreaterThan(0);
    });

    it('should include VND in supported currencies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/supported')
        .expect(200);

      const currencies = response.body.data.currencies as any[];
      const vndCurrency = currencies.find((c: any) => c.code === 'VND');
      expect(vndCurrency).toBeDefined();
      expect(vndCurrency).toMatchObject({
        code: 'VND',
        name: expect.any(String),
        symbol: '₫',
      });
    });

    it('should include major travel currencies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/supported')
        .expect(200);

      const currencies = response.body.data.currencies as Array<{
        code: string;
      }>;
      const currencyCodes = currencies.map((c) => c.code);

      expect(currencyCodes).toContain('USD');
      expect(currencyCodes).toContain('EUR');
      expect(currencyCodes).toContain('GBP');
      expect(currencyCodes).toContain('JPY');
      expect(currencyCodes).toContain('VND');
    });

    it('should prioritize common currencies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/supported')
        .expect(200);

      const currencies = response.body.data.currencies as Array<{
        code: string;
      }>;
      const currencyCodes = currencies.map((c) => c.code);

      // VND should appear early in the list for Vietnam-focused app
      const vndIndex = currencyCodes.indexOf('VND');
      const usdIndex = currencyCodes.indexOf('USD');
      const eurIndex = currencyCodes.indexOf('EUR');

      expect(vndIndex).toBeLessThan(10); // Should be in top 10
      expect(usdIndex).toBeLessThan(10); // Should be in top 10
      expect(eurIndex).toBeLessThan(10); // Should be in top 10
    });

    it('should include currency symbols', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/supported')
        .expect(200);

      const currencies = response.body.data.currencies as any[];
      currencies.forEach((currency: any) => {
        expect(currency).toHaveProperty('code');
        expect(currency).toHaveProperty('name');
        expect(currency).toHaveProperty('symbol');
        expect(typeof currency.code).toBe('string');
        expect(typeof currency.name).toBe('string');
        expect(typeof currency.symbol).toBe('string');
      });
    });
  });

  describe('Error handling', () => {
    it('should handle missing request body', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .send()
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
      expect(response.body).toHaveProperty('status', 400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid JSON', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('result', 'ERROR');
    });

    it('should return consistent error format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
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
    it('should return currency conversion in correct format', async () => {
      const conversionRequest = {
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'VND',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .send(conversionRequest)
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
        originalAmount: expect.any(Number),
        convertedAmount: expect.any(Number),
        exchangeRate: expect.any(Number),
        fromCurrency: expect.any(String),
        toCurrency: expect.any(String),
        formattedAmount: expect.any(String),
        provider: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should return exchange rates in correct format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/rates/USD')
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
        baseCurrency: expect.any(String),
        rates: expect.any(Object),
        provider: expect.any(String),
        lastUpdated: expect.any(String),
      });
    });
  });

  describe('Performance and caching', () => {
    it('should handle multiple concurrent requests', async () => {
      const conversionRequest = {
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'VND',
      };

      const promises = Array(5)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/api/v1/currency/convert')
            .send(conversionRequest),
        );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('result', 'OK');
      });
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/supported')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
      expect(response.body).toHaveProperty('result', 'OK');
    });
  });
});
