import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CountryService } from './country.service';
import { CountryModule } from './country.module';
import { LocationModule } from '../../location/location.module';
import { CurrencyModule } from '../../currency/currency.module';
import { SharedModule } from '../shared.module';
import { LocationSource } from '../../location/interfaces/smart-location.interface';

/**
 * Integration tests for CountryService within the NestJS module system
 */
describe('CountryService Integration', () => {
  let service: CountryService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        SharedModule,
        CountryModule,
        LocationModule,
        CurrencyModule,
      ],
    }).compile();

    service = module.get<CountryService>(CountryService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Module Dependencies', () => {
    it('should be defined and properly injected', () => {
      expect(service).toBeDefined();
    });

    it('should have access to LocationService', () => {
      // @ts-expect-error - Accessing private property for testing
      expect(service.locationService).toBeDefined();
    });

    it('should have access to CurrencyService', () => {
      // @ts-expect-error - Accessing private property for testing
      expect(service.currencyService).toBeDefined();
    });

    it('should have access to CountryDefaultsService', () => {
      // @ts-expect-error - Accessing private property for testing
      expect(service.countryDefaultsService).toBeDefined();
    });

    it('should have access to APIThrottleService', () => {
      // @ts-expect-error - Accessing private property for testing
      expect(service.apiThrottleService).toBeDefined();
    });
  });

  describe('Basic Functionality', () => {
    it('should detect country from Vietnamese coordinates', async () => {
      const result = await service.detectCountryFromCoordinates(
        21.0285,
        105.8542,
      );

      expect(result).toBeDefined();
      expect(result.countryCode).toBe('VN');
      expect(result.countryName).toBe('Vietnam');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should get country defaults', async () => {
      const result = await service.getCountryDefaults('VN');

      expect(result).toBeDefined();
      expect(result.currency).toBe('VND');
      expect(result.timezone).toBe('Asia/Ho_Chi_Minh');
      expect(result.language).toBe('vi');
      expect(result.budgetInfo).toBeDefined();
      expect(result.travelInsights).toBeDefined();
    });

    it('should detect Vietnamese locations', () => {
      const hanoi = {
        id: '123',
        name: 'Hà Nội',
        displayName: 'Hà Nội, Vietnam',
        coordinates: { lat: 21.0285, lng: 105.8542 },
        country: 'Vietnam',
        countryCode: 'VN',
        address: 'Hà Nội, Vietnam',
        placeType: 'city',
        source: LocationSource.GOONG,
        importance: 1,
      };

      const result = service.isVietnameseLocation(hanoi);
      expect(result).toBe(true);
    });

    it('should format location strings correctly', () => {
      const result = service.formatLocationString(
        'Ho Chi Minh City',
        'Ho Chi Minh',
        'Vietnam',
      );
      expect(result).toBe('Ho Chi Minh City, Ho Chi Minh, Vietnam');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid coordinates gracefully', async () => {
      const result = await service.detectCountryFromCoordinates(999, 999);

      expect(result).toBeDefined();
      expect(result.source).toBe('fallback');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle unknown country codes', async () => {
      try {
        await service.getCountryDefaults('XX');
        fail('Expected error for unknown country code');
      } catch (error) {
        expect(error.message).toContain('Country XX is not supported');
      }
    });
  });
});
