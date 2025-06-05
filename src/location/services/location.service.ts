import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import axios from 'axios';
import { VietnamLocationEntity } from '../entities/vietnam-location.entity';
import { DestinationEntity } from '../entities/destination.entity';
import { APIThrottleService } from '../../shared/services/api-throttle.service';
import { ErrorUtilService } from '../../shared/utils/error.util';
import { PaginationUtilService } from '../../shared/utils/pagination.util';
import { PaginationResult } from '../../shared/types/pagination.types';
import {
  GoongResult,
  GoongResponse,
  NominatimResult,
  GeoapifyFeature,
  GeoapifyResponse,
  VietnamProvince,
} from '../types/api-response.types';

export interface Location {
  id: string;
  name: string;
  displayName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  country: string;
  countryCode: string;
  province?: string;
  district?: string;
  address: string;
  placeType: string;
  source: string;
}

export interface Province {
  id: number;
  name: string;
  slug: string;
  type: string;
  nameWithType: string;
  code: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  districts?: any[];
}

export interface POI {
  id: string;
  name: string;
  category: string;
  rating?: number;
  coordinates: {
    lat: number;
    lng: number;
  };
  address: string;
  openingHours?: Record<string, string>;
  priceLevel?: string;
  photos?: string[];
  source: string;
}

/**
 * Location search service with Vietnam optimization and multi-API fallbacks
 */
@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    @InjectRepository(VietnamLocationEntity)
    private vietnamLocationRepository: Repository<VietnamLocationEntity>,
    @InjectRepository(DestinationEntity)
    private destinationRepository: Repository<DestinationEntity>,
    private configService: ConfigService,
    private apiThrottleService: APIThrottleService,
  ) {}

  /**
   * Smart location search with Vietnam priority
   */
  async searchLocation(
    query: string,
    userCountry?: string,
  ): Promise<Location[]> {
    try {
      this.logger.log(
        `Searching for location: ${query}, userCountry: ${userCountry}`,
      );

      // First, try Vietnam-specific search if query seems Vietnamese
      if (this.isVietnameseQuery(query, userCountry)) {
        const vietnamResults = await this.searchVietnameseLocations(query);
        if (vietnamResults.length > 0) {
          return vietnamResults;
        }

        // Try Goong API for Vietnam
        const goongResults = await this.searchWithGoong(query);
        if (goongResults.length > 0) {
          return goongResults;
        }
      }

      // Fallback to international search
      const nominatimResults = await this.searchWithNominatim(query);
      return nominatimResults;
    } catch (error: unknown) {
      this.logger.error(
        `Location search failed: ${ErrorUtilService.getErrorMessage(error)}`,
        ErrorUtilService.getErrorStack(error),
      );
      throw new HttpException(
        'Location search temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Get Vietnamese administrative regions
   */
  async getVietnameseRegions(): Promise<Province[]> {
    try {
      // Check cache first (in a real app, use Redis)
      const cachedProvinces = await this.vietnamLocationRepository.find({
        where: { districtId: IsNull(), wardId: IsNull() },
        order: { provinceName: 'ASC' },
      });

      if (cachedProvinces.length > 0) {
        return cachedProvinces.map(this.mapVietnamEntityToProvince);
      }

      // Fetch from API if not cached
      const response = await axios.get<VietnamProvince[]>(
        'https://provinces.open-api.vn/api/p/',
      );
      const provinces: VietnamProvince[] = response.data;

      this.logger.log(
        `Fetched ${provinces.length} Vietnamese provinces from API`,
      );
      return provinces.map((province) => ({
        id: province.code,
        name: province.name,
        slug: province.slug || '',
        type: province.type || '',
        nameWithType: province.name_with_type || province.name,
        code: province.code.toString(),
        coordinates: undefined,
      }));
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch Vietnamese regions: ${ErrorUtilService.getErrorMessage(error)}`,
      );
      throw new HttpException(
        'Unable to fetch Vietnamese regions',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Enhanced POI search with multiple fallbacks
   */
  async findNearbyPlaces(
    lat: number,
    lng: number,
    category: string,
    radius: number = 5000,
    limit: number = 20,
  ): Promise<PaginationResult<POI>> {
    try {
      this.logger.log(
        `Searching for POIs near ${lat},${lng}, category: ${category}`,
      );

      // Try Geoapify first (more generous free tier)
      if (this.apiThrottleService.checkAndLog('geoapify')) {
        const geoapifyResults = await this.searchWithGeoapify(
          lat,
          lng,
          category,
          radius,
          limit,
        );
        if (geoapifyResults.length > 0) {
          return PaginationUtilService.createPaginationResult(geoapifyResults, {
            page: 1,
            limit,
            total: geoapifyResults.length,
          });
        }
      }

      // Fallback to Nominatim for basic POI search
      const nominatimResults = await this.searchPOIWithNominatim(
        lat,
        lng,
        category,
        radius,
        limit,
      );
      return PaginationUtilService.createPaginationResult(nominatimResults, {
        page: 1,
        limit,
        total: nominatimResults.length,
      });
    } catch (error: unknown) {
      this.logger.error(
        `POI search failed: ${ErrorUtilService.getErrorMessage(error)}`,
        ErrorUtilService.getErrorStack(error),
      );
      throw new HttpException(
        'Places search temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Check if query is likely Vietnamese
   */
  private isVietnameseQuery(query: string, userCountry?: string): boolean {
    // Check user country
    if (userCountry === 'VN') {
      return true;
    }

    // Check for Vietnamese characters
    const vietnamesePattern =
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    if (vietnamesePattern.test(query)) {
      return true;
    }

    // Check for common Vietnamese place names
    const vietnamesePlaces = [
      'hồ chí minh',
      'sài gòn',
      'hà nội',
      'đà nẵng',
      'hải phòng',
      'cần thơ',
      'biên hòa',
      'nha trang',
      'bình dương',
      'đồng nai',
      'an giang',
      'bà rịa',
      'bạc liêu',
      'bắc giang',
      'bắc kạn',
      'bắc ninh',
      'bến tre',
      'bình định',
      'bình phước',
      'bình thuận',
      'cà mau',
      'cao bằng',
      'đắk lắk',
      'đắk nông',
    ];

    return vietnamesePlaces.some(
      (place) =>
        query.toLowerCase().includes(place) ||
        place.includes(query.toLowerCase()),
    );
  }

  /**
   * Search Vietnam locations from database
   */
  private async searchVietnameseLocations(query: string): Promise<Location[]> {
    const locations = await this.vietnamLocationRepository
      .createQueryBuilder('vl')
      .where('LOWER(vl.full_name) LIKE LOWER(:query)', { query: `%${query}%` })
      .orWhere('LOWER(vl.province_name) LIKE LOWER(:query)', {
        query: `%${query}%`,
      })
      .orWhere('LOWER(vl.district_name) LIKE LOWER(:query)', {
        query: `%${query}%`,
      })
      .orderBy('vl.province_name', 'ASC')
      .limit(10)
      .getMany();

    return locations.map(this.mapVietnamEntityToLocation);
  }

  /**
   * Search with Goong Maps API (Vietnam-specific)
   */
  private async searchWithGoong(query: string): Promise<Location[]> {
    if (!this.apiThrottleService.checkAndLog('goong')) {
      return [];
    }

    const apiKey = this.configService.get<string>('GOONG_API_KEY');
    if (!apiKey) {
      this.logger.warn('Goong API key not configured');
      return [];
    }

    try {
      const response = await axios.get<GoongResponse>(
        'https://rsapi.goong.io/geocode',
        {
          params: {
            address: query,
            api_key: apiKey,
          },
          timeout: 5000,
        },
      );

      const results: GoongResult[] = response.data.results || [];
      return results.slice(0, 10).map(this.mapGoongToLocation);
    } catch (error: unknown) {
      this.logger.warn(
        `Goong API error: ${ErrorUtilService.getErrorMessage(error)}`,
      );
      return [];
    }
  }

  /**
   * Search with Nominatim (OpenStreetMap)
   */
  private async searchWithNominatim(query: string): Promise<Location[]> {
    if (!this.apiThrottleService.checkAndLog('nominatim')) {
      return [];
    }

    try {
      const response = await axios.get<NominatimResult[]>(
        'https://nominatim.openstreetmap.org/search',
        {
          params: {
            q: query,
            format: 'json',
            limit: 10,
            addressdetails: 1,
            extratags: 1,
          },
          headers: {
            'User-Agent': 'TripMaster/1.0 (contact@tripmaster.com)',
          },
          timeout: 5000,
        },
      );

      const results: NominatimResult[] = response.data;
      return results.map(this.mapNominatimToLocation);
    } catch (error: unknown) {
      this.logger.warn(
        `Nominatim API error: ${ErrorUtilService.getErrorMessage(error)}`,
      );
      return [];
    }
  }

  /**
   * Search POI with Geoapify
   */
  private async searchWithGeoapify(
    lat: number,
    lng: number,
    category: string,
    radius: number,
    limit: number,
  ): Promise<POI[]> {
    const apiKey = this.configService.get<string>('GEOAPIFY_API_KEY');
    if (!apiKey) {
      this.logger.warn('Geoapify API key not configured');
      return [];
    }

    try {
      const categoryMap = {
        attractions: 'tourism',
        restaurants: 'catering',
        hotels: 'accommodation',
        shopping: 'commercial',
        entertainment: 'entertainment',
        all: '',
      };

      const response = await axios.get<GeoapifyResponse>(
        'https://api.geoapify.com/v2/places',
        {
          params: {
            categories: categoryMap[category as keyof typeof categoryMap] || '',
            filter: `circle:${lng},${lat},${radius}`,
            limit,
            apiKey,
          },
          timeout: 5000,
        },
      );

      const features: GeoapifyFeature[] = response.data.features || [];
      return features.map(this.mapGeoapifyToPOI);
    } catch (error: unknown) {
      this.logger.warn(
        `Geoapify API error: ${ErrorUtilService.getErrorMessage(error)}`,
      );
      return [];
    }
  }

  /**
   * Search POI with Nominatim (basic fallback)
   */
  private async searchPOIWithNominatim(
    lat: number,
    lng: number,
    category: string,
    radius: number,
    limit: number,
  ): Promise<POI[]> {
    try {
      const categoryMap = {
        attractions: 'tourism',
        restaurants: 'amenity=restaurant',
        hotels: 'tourism=hotel',
        shopping: 'shop',
        entertainment: 'leisure',
        all: '',
      };

      const searchQuery =
        categoryMap[category as keyof typeof categoryMap] || category;

      const response = await axios.get<NominatimResult[]>(
        'https://nominatim.openstreetmap.org/search',
        {
          params: {
            q: searchQuery,
            format: 'json',
            limit,
            addressdetails: 1,
            extratags: 1,
            bounded: 1,
            viewbox: `${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}`,
          },
          headers: {
            'User-Agent': 'TripMaster/1.0 (contact@tripmaster.com)',
          },
          timeout: 5000,
        },
      );

      const results: NominatimResult[] = response.data;
      return results.slice(0, limit).map(this.mapNominatimToPOI);
    } catch (error: unknown) {
      this.logger.warn(
        `Nominatim POI search error: ${ErrorUtilService.getErrorMessage(error)}`,
      );
      return [];
    }
  }

  // Mapping functions
  private mapVietnamEntityToLocation = (
    entity: VietnamLocationEntity,
  ): Location => ({
    id: entity.id,
    name: entity.provinceName,
    displayName: entity.fullName,
    coordinates: entity.coordinates
      ? this.parseCoordinates(entity.coordinates)
      : { lat: 0, lng: 0 },
    country: 'Vietnam',
    countryCode: 'VN',
    province: entity.provinceName,
    district: entity.districtName,
    address: entity.pathWithType || entity.fullName,
    placeType: entity.type || 'administrative',
    source: 'vietnam-db',
  });

  private mapVietnamEntityToProvince = (
    entity: VietnamLocationEntity,
  ): Province => ({
    id: entity.provinceId || 0,
    name: entity.provinceName,
    slug: entity.slug || '',
    type: entity.type || '',
    nameWithType: entity.nameWithType || entity.provinceName,
    code: entity.provinceId?.toString() || '',
    coordinates: entity.coordinates
      ? this.parseCoordinates(entity.coordinates)
      : undefined,
  });

  private mapGoongToLocation = (result: GoongResult): Location => ({
    id: result.place_id || `goong_${Date.now()}`,
    name: result.name || result.formatted_address?.split(',')[0] || 'Unknown',
    displayName: result.formatted_address || 'Unknown location',
    coordinates: {
      lat: result.geometry?.location?.lat || 0,
      lng: result.geometry?.location?.lng || 0,
    },
    country: 'Vietnam',
    countryCode: 'VN',
    province: result.compound?.province,
    district: result.compound?.district,
    address: result.formatted_address || '',
    placeType: result.types?.[0] || 'place',
    source: 'goong',
  });

  private mapNominatimToLocation = (result: NominatimResult): Location => ({
    id: result.place_id?.toString() || `nominatim_${Date.now()}`,
    name: result.display_name?.split(',')[0] || 'Unknown',
    displayName: result.display_name || 'Unknown location',
    coordinates: {
      lat: parseFloat(result.lat || '0'),
      lng: parseFloat(result.lon || '0'),
    },
    country: result.address?.country || '',
    countryCode: result.address?.country_code?.toUpperCase() || '',
    province: result.address?.state,
    district: result.address?.county,
    address: result.display_name || '',
    placeType: result.type || 'place',
    source: 'nominatim',
  });

  private mapGeoapifyToPOI = (feature: GeoapifyFeature): POI => ({
    id: feature.properties?.place_id || `geoapify_${Date.now()}`,
    name:
      feature.properties?.name ||
      feature.properties?.address_line1 ||
      'Unknown',
    category: feature.properties?.categories?.[0] || 'general',
    rating: feature.properties?.rating,
    coordinates: {
      lat: feature.geometry?.coordinates?.[1] || 0,
      lng: feature.geometry?.coordinates?.[0] || 0,
    },
    address: feature.properties?.formatted || '',
    openingHours: feature.properties?.opening_hours,
    priceLevel: feature.properties?.price_level,
    photos: feature.properties?.photos || [],
    source: 'geoapify',
  });

  private mapNominatimToPOI = (result: NominatimResult): POI => ({
    id: result.place_id?.toString() || `nominatim_poi_${Date.now()}`,
    name: result.display_name?.split(',')[0] || 'Unknown',
    category: result.type || 'general',
    coordinates: {
      lat: parseFloat(result.lat || '0'),
      lng: parseFloat(result.lon || '0'),
    },
    address: result.display_name || '',
    source: 'nominatim',
  });

  private parseCoordinates(coords: string): { lat: number; lng: number } {
    try {
      // Handle PostGIS POINT format: POINT(lng lat)
      const match = coords.match(/POINT\(([^)]+)\)/);
      if (match) {
        const [lng, lat] = match[1].split(' ').map(Number);
        return { lat, lng };
      }
      return { lat: 0, lng: 0 };
    } catch {
      return { lat: 0, lng: 0 };
    }
  }
}
