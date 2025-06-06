import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as request from 'supertest';
import { APIThrottleService } from '../shared/services/api-throttle.service';
import { SharedModule } from '../shared/shared.module';
import { CurrencyModule } from './currency.module';
import { CurrencyService } from './services/currency.service';

describe('CurrencyController (Integration)', () => {
  let app: INestApplication;
  let accessToken: string;

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
      .overrideProvider(CurrencyService)
      .useValue({
        convertCurrency: jest
          .fn()
          .mockImplementation((amount: number, from: string, to: string) => {
            // Handle same currency conversion
            if (from === to) {
              return Promise.resolve({
                from,
                to,
                amount,
                convertedAmount: amount,
                exchangeRate: 1,
                formattedAmount:
                  from === 'USD' ? `$${amount}` : `${amount} ${to}`,
                conversionDate: new Date().toISOString(),
              });
            }

            // Handle different currency conversions
            const rate = from === 'USD' && to === 'VND' ? 25000 : 0.85;
            const convertedAmount = amount * rate;
            return Promise.resolve({
              from,
              to,
              amount,
              convertedAmount,
              exchangeRate: rate,
              formattedAmount:
                to === 'VND'
                  ? `${convertedAmount.toLocaleString()} ₫`
                  : `${convertedAmount} ${to}`,
              conversionDate: new Date().toISOString(),
            });
          }),
        getExchangeRates: jest
          .fn()
          .mockImplementation((base: string = 'USD') => {
            return Promise.resolve({
              base: base.toUpperCase(), // Always return uppercase base
              date: '2024-06-05',
              rates: {
                VND: 25000,
                EUR: 0.85,
                GBP: 0.75,
                USD: 1,
              },
              lastUpdated: new Date().toISOString(),
              source: 'exchangerate-api',
            });
          }),
        getPopularCurrencies: jest.fn().mockReturnValue([
          { code: 'USD', name: 'US Dollar', symbol: '$' },
          { code: 'EUR', name: 'Euro', symbol: '€' },
          { code: 'GBP', name: 'British Pound', symbol: '£' },
          { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
        ]),
        clearCache: jest.fn().mockReturnValue(undefined),
        getCacheStats: jest.fn().mockReturnValue({
          size: 10,
          keys: ['USD_VND,EUR,GBP', 'EUR_USD,VND'],
        }),
      })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');

    // Configure ValidationPipe globally (same as main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    accessToken = 'mock-jwt-token';

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
        from: 'USD',
        to: 'VND',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(conversionRequest)
        .expect(200);

      expect(response.body).toHaveProperty('result', 'OK');
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('amount', 100);
      expect(response.body.data).toHaveProperty('convertedAmount');
      expect(response.body.data).toHaveProperty('exchangeRate');
      expect(response.body.data).toHaveProperty('from', 'USD');
      expect(response.body.data).toHaveProperty('to', 'VND');
      expect(response.body.data).toHaveProperty('formattedAmount');
      expect(typeof response.body.data.convertedAmount).toBe('number');
      expect(typeof response.body.data.exchangeRate).toBe('number');
    });

    it('should handle same currency conversion', async () => {
      const conversionRequest = {
        amount: 100,
        from: 'USD',
        to: 'USD',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(conversionRequest)
        .expect(200);

      expect(response.body.data.amount).toBe(100);
      expect(response.body.data.convertedAmount).toBe(100);
      expect(response.body.data.exchangeRate).toBe(1);
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        from: 'USD',
        to: 'VND',
        // Missing amount
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(
        (response.body.message as string[]).some((msg: string) =>
          msg.includes('amount'),
        ),
      ).toBe(true);
    });

    it('should validate amount parameter', async () => {
      const invalidRequest = {
        amount: -100,
        from: 'USD',
        to: 'VND',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(
        (response.body.message as string[]).some((msg: string) =>
          msg.includes('amount must not be less than 0.01'),
        ),
      ).toBe(true);
    });

    it('should validate currency codes', async () => {
      const invalidRequest = {
        amount: 100,
        from: 'INVALID',
        to: 'VND',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(
        (response.body.message as string[]).some((msg: string) =>
          msg.includes('from must be shorter than or equal to 3 characters'),
        ),
      ).toBe(true);
    });

    it('should handle large amounts', async () => {
      const largeAmountRequest = {
        amount: 1000000,
        from: 'USD',
        to: 'VND',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(largeAmountRequest)
        .expect(200);

      expect(response.body.data.amount).toBe(1000000);
      expect(response.body.data.convertedAmount).toBeGreaterThan(0);
      expect(response.body.data.formattedAmount).toContain('₫');
    });
  });

  describe('GET /api/v1/currency/rates', () => {
    it('should get exchange rates successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/rates?base=USD')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('result', 'OK');
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('base', 'USD');
      expect(response.body.data).toHaveProperty('rates');
      expect(response.body.data).toHaveProperty('source');
      expect(response.body.data).toHaveProperty('lastUpdated');
      expect(typeof response.body.data.rates).toBe('object');
    });

    it('should get VND exchange rates with specific currencies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/rates?base=VND&currencies=USD,EUR,GBP')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.base).toBe('VND');
      expect(response.body.data).toHaveProperty('rates');
      expect(typeof response.body.data.rates).toBe('object');
    });

    it('should validate currency code parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/rates?base=INVALID')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(
        (response.body.message as string[]).some((msg: string) =>
          msg.includes('base must be shorter than or equal to 3 characters'),
        ),
      ).toBe(true);
    });

    it('should handle case insensitive currency codes', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/rates?base=usd')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.base).toBe('USD');
    });

    it('should include major currencies in rates', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/rates?base=USD&currencies=VND,EUR,GBP')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const rates = response.body.data.rates;
      expect(rates).toHaveProperty('VND');
      expect(rates).toHaveProperty('EUR');
      expect(rates).toHaveProperty('GBP');
      expect(typeof rates.VND).toBe('number');
      expect(typeof rates.EUR).toBe('number');
    });
  });

  describe('GET /api/v1/currency/popular', () => {
    it('should get popular currencies successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/popular')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('result', 'OK');
      expect(response.body).toHaveProperty('status', 200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should include VND in popular currencies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/popular')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const currencies = response.body.data as any[];
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
        .get('/api/v1/currency/popular')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const currencies = response.body.data as Array<{ code: string }>;
      const currencyCodes = currencies.map((c) => c.code);

      expect(currencyCodes).toContain('USD');
      expect(currencyCodes).toContain('EUR');
      expect(currencyCodes).toContain('VND');
    });

    it('should prioritize common currencies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/popular')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const currencies = response.body.data as Array<{ code: string }>;
      const currencyCodes = currencies.map((c) => c.code);

      const vndIndex = currencyCodes.indexOf('VND');
      const usdIndex = currencyCodes.indexOf('USD');
      const eurIndex = currencyCodes.indexOf('EUR');

      expect(vndIndex).toBeGreaterThanOrEqual(0);
      expect(usdIndex).toBeGreaterThanOrEqual(0);
      expect(eurIndex).toBeGreaterThanOrEqual(0);
    });

    it('should include currency symbols', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/popular')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const currencies = response.body.data as any[];
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
        .set('Authorization', `Bearer ${accessToken}`)
        .send()
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should handle invalid JSON', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${accessToken}`)
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return consistent error format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });
  });

  describe('Response format validation', () => {
    it('should return currency conversion in correct format', async () => {
      const conversionRequest = {
        amount: 100,
        from: 'USD',
        to: 'VND',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/currency/convert')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(conversionRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        result: 'OK',
        status: 200,
        data: expect.any(Object),
      });

      expect(response.body.data).toMatchObject({
        amount: expect.any(Number),
        convertedAmount: expect.any(Number),
        exchangeRate: expect.any(Number),
        from: expect.any(String),
        to: expect.any(String),
        formattedAmount: expect.any(String),
        conversionDate: expect.any(String),
      });
    });

    it('should return exchange rates in correct format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/currency/rates?base=USD')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        result: 'OK',
        status: 200,
        data: expect.any(Object),
      });

      expect(response.body.data).toMatchObject({
        base: expect.any(String),
        rates: expect.any(Object),
        source: expect.any(String),
        lastUpdated: expect.any(String),
      });
    });
  });

  describe('Performance and caching', () => {
    it('should handle multiple concurrent requests', async () => {
      const conversionRequest = {
        amount: 100,
        from: 'USD',
        to: 'VND',
      };

      const promises = Array(5)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/api/v1/currency/convert')
            .set('Authorization', `Bearer ${accessToken}`)
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
        .get('/api/v1/currency/popular')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(5000);
      expect(response.body).toHaveProperty('result', 'OK');
    });
  });
});
