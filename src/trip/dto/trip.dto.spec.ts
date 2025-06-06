import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  CreateTripDto,
  UpdateTripDto,
  TripQueryDto,
  CountryAwareTripResponseDto,
} from './trip.dto';
import { TripStatus } from '../../schemas/trip.entity';

describe('Trip DTOs', () => {
  describe('CreateTripDto', () => {
    it('should validate a complete trip creation request', async () => {
      const tripData = {
        title: 'Amazing Vietnam Adventure 2024',
        description: 'Exploring Ho Chi Minh City and the Mekong Delta',
        destinationName: 'Ho Chi Minh City, Vietnam',
        destinationCoords: { lat: 10.8231, lng: 106.6297 },
        preferredCountry: 'VN',
        detectCountryFromCoords: true,
        destinationCountry: 'VN',
        destinationProvince: 'Ho Chi Minh',
        destinationCity: 'Ho Chi Minh City',
        timezone: 'Asia/Ho_Chi_Minh',
        defaultCurrency: 'VND',
        startDate: '2024-12-01',
        endDate: '2024-12-10',
        budget: 1500,
        currency: 'VND', // Fixed: Use VND for Vietnam
        status: TripStatus.PLANNING,
        isPublic: false,
      };

      const dto = plainToClass(CreateTripDto, tripData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.title).toBe('Amazing Vietnam Adventure 2024');
      expect(dto.preferredCountry).toBe('VN');
      expect(dto.detectCountryFromCoords).toBe(true);
      expect(dto.destinationCountry).toBe('VN');
      expect(dto.timezone).toBe('Asia/Ho_Chi_Minh');
      expect(dto.defaultCurrency).toBe('VND');
    });

    it('should validate minimal trip creation request', async () => {
      const tripData = {
        title: 'Simple Trip',
        destinationName: 'Tokyo, Japan',
        startDate: '2024-12-01',
        endDate: '2024-12-05',
      };

      const dto = plainToClass(CreateTripDto, tripData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.title).toBe('Simple Trip');
      expect(dto.destinationName).toBe('Tokyo, Japan');
      expect(dto.detectCountryFromCoords).toBe(true); // default value
    });

    it('should reject invalid country codes', async () => {
      const tripData = {
        title: 'Invalid Country Trip',
        destinationName: 'Somewhere',
        preferredCountry: 'INVALID', // should be 2 characters
        destinationCountry: 'X', // should be 2 characters
        startDate: '2024-12-01',
        endDate: '2024-12-05',
      };

      const dto = plainToClass(CreateTripDto, tripData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const countryErrors = errors.filter(
        (error) =>
          error.property === 'preferredCountry' ||
          error.property === 'destinationCountry',
      );
      expect(countryErrors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateTripDto', () => {
    it('should validate trip update with country changes', async () => {
      const updateData = {
        title: 'Updated Vietnam Adventure',
        destinationCountry: 'VN',
        reDetectCountryFromCoords: true,
        autoUpdateCurrency: true,
        destinationCity: 'Da Nang',
        timezone: 'Asia/Ho_Chi_Minh',
        defaultCurrency: 'VND',
        currency: 'VND', // Fixed: Use VND for Vietnam
      };

      const dto = plainToClass(UpdateTripDto, updateData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.destinationCountry).toBe('VN');
      expect(dto.reDetectCountryFromCoords).toBe(true);
      expect(dto.autoUpdateCurrency).toBe(true);
      expect(dto.destinationCity).toBe('Da Nang');
    });

    it('should validate partial updates', async () => {
      const updateData = {
        title: 'Just Title Update',
      };

      const dto = plainToClass(UpdateTripDto, updateData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.title).toBe('Just Title Update');
    });
  });

  describe('TripQueryDto', () => {
    it('should validate comprehensive trip search query', async () => {
      const queryData = {
        status: TripStatus.PLANNING,
        country: 'VN',
        region: 'southeast-asia',
        destinationCity: 'Ho Chi Minh City',
        timezone: 'Asia/Ho_Chi_Minh',
        defaultCurrency: 'VND',
        sortByProximity: true,
        userLat: 10.8231,
        userLng: 106.6297,
        page: 1,
        limit: 20,
      };

      const dto = plainToClass(TripQueryDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.country).toBe('VN');
      expect(dto.region).toBe('southeast-asia');
      expect(dto.sortByProximity).toBe(true);
      expect(dto.userLat).toBe(10.8231);
      expect(dto.userLng).toBe(106.6297);
    });

    it('should reject invalid region values', async () => {
      const queryData = {
        region: 'invalid-region',
      };

      const dto = plainToClass(TripQueryDto, queryData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const regionError = errors.find((error) => error.property === 'region');
      expect(regionError).toBeDefined();
    });

    it('should reject invalid coordinates', async () => {
      const queryData = {
        userLat: 91, // invalid latitude (max is 90)
        userLng: 181, // invalid longitude (max is 180)
      };

      const dto = plainToClass(TripQueryDto, queryData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const coordinateErrors = errors.filter(
        (error) => error.property === 'userLat' || error.property === 'userLng',
      );
      expect(coordinateErrors.length).toBeGreaterThan(0);
    });
  });

  describe('CountryAwareTripResponseDto', () => {
    it('should create a complete country-aware response', () => {
      const responseData = {
        id: 'uuid-123',
        title: 'Vietnam Adventure',
        destinationName: 'Ho Chi Minh City, Vietnam',
        formattedLocation: 'Ho Chi Minh City, Ho Chi Minh, Vietnam',
        enhancedFormattedLocation: 'Ho Chi Minh City, Ho Chi Minh, Vietnam',
        detectedCountry: 'VN',
        suggestedCurrency: 'VND',
        destinationCountry: 'VN',
        destinationCity: 'Ho Chi Minh City',
        timezone: 'Asia/Ho_Chi_Minh',
        startDate: '2024-12-01',
        endDate: '2024-12-10',
        durationDays: 9,
        status: TripStatus.PLANNING,
        isPublic: false,
        createdAt: '2024-06-05T10:00:00.000Z',
        updatedAt: '2024-06-05T10:00:00.000Z',
        geographicalInfo: {
          region: 'southeast-asia',
          subRegion: 'mainland-southeast-asia',
          continent: 'asia',
          borders: ['KH', 'LA', 'CN'],
          isIsland: false,
          isLandlocked: false,
        },
        distanceFromUser: 1250.5,
        travelTimeFromUser: {
          byAir: {
            duration: '2h 30m',
            estimatedCost: { min: 150, max: 400, currency: 'USD' },
          },
        },
      };

      const dto = plainToClass(CountryAwareTripResponseDto, responseData);

      expect(dto.id).toBe('uuid-123');
      expect(dto.detectedCountry).toBe('VN');
      expect(dto.suggestedCurrency).toBe('VND');
      expect(dto.enhancedFormattedLocation).toBe(
        'Ho Chi Minh City, Ho Chi Minh, Vietnam',
      );
      expect(dto.geographicalInfo?.region).toBe('southeast-asia');
      expect(dto.distanceFromUser).toBe(1250.5);
    });
  });
});
