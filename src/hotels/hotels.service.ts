import { Injectable } from '@nestjs/common';
import { RedisCacheService } from '../redis/redis-cache.service';
import { AmadeusApiService } from '../integrations/amadeus/amadeus-api.service';
import {
  getHotelOffersDto,
  getHotelsByCityDto,
} from 'src/hotels/dto/request/search-hotels.dto';

type SearchResult<T> = { count: number; items: T[] };

@Injectable()
export class HotelsService {
  private readonly ttlSeconds = 2 * 60 * 60; // 2h
  constructor(
    private readonly cache: RedisCacheService,
    private readonly amadeus: AmadeusApiService,
  ) {}

  async getHotelList(
    dto: getHotelsByCityDto,
  ): Promise<SearchResult<Record<string, unknown>>> {
    const ratingsKey = Array.isArray(dto.ratings)
      ? dto.ratings.join(',')
      : dto.ratings;
    console.log('Ratings Key:', ratingsKey);
    const amenitiesKey = Array.isArray(dto.amenities)
      ? dto.amenities.join(',')
      : dto.amenities;
    const chainCodesKey = Array.isArray(dto.chainCodes)
      ? dto.chainCodes.join(',')
      : dto.chainCodes;
    const key = `hotels:search:${dto.cityCode}:${dto.radius}:${dto.radiusUnit}:${ratingsKey}:${amenitiesKey || 1}:${chainCodesKey || 1}`;
    const cached =
      await this.cache.get<SearchResult<Record<string, unknown>>>(key);
    if (cached) return cached;

    const data = await this.amadeus.searchHotelsByCity({
      cityCode: dto.cityCode,
      radius: dto.radius,
      radiusUnit: dto.radiusUnit,
      ratings: ratingsKey,
      amenities: amenitiesKey,
      chainCodes: chainCodesKey,
    });
    const result: SearchResult<Record<string, unknown>> = {
      count: Array.isArray(data) ? data.length : 0,
      items: (data as Record<string, unknown>[]) || [],
    };
    await this.cache.set(key, result, this.ttlSeconds);
    return result;
  }

  async getHotelOffers(
    dto: getHotelOffersDto,
  ): Promise<SearchResult<Record<string, unknown>>> {
    const hotelIdsKey = Array.isArray(dto.hotelIds)
      ? dto.hotelIds.join(',')
      : dto.hotelIds;
    const key = `hotels:offers:${hotelIdsKey}:${dto.adults}:${dto.checkInDate}:${dto.checkOutDate}:${dto.countryOfResidence}:${dto.roomQuantity}:${dto.price}:${dto.currency}:${dto.paymentPolicy}:${dto.boardType}:${dto.includeClosed}:${dto.bestRateOnly}:${dto.lang}`;
    const cached =
      await this.cache.get<SearchResult<Record<string, unknown>>>(key);
    if (cached) return cached;

    const data = await this.amadeus.getMultiHotelOffers({
      hotelIds: hotelIdsKey,
      adults: dto.adults,
      checkInDate: dto.checkInDate,
      checkOutDate: dto.checkOutDate,
      countryOfResidence: dto.countryOfResidence,
      roomQuantity: dto.roomQuantity,
      price: dto.price,
      currency: dto.currency,
      paymentPolicy: dto.paymentPolicy,
      boardType: dto.boardType,
      includeClosed: dto.includeClosed,
      bestRateOnly: dto.bestRateOnly,
      lang: dto.lang,
    });
    const result: SearchResult<Record<string, unknown>> = {
      count: Array.isArray(data) ? data.length : 0,
      items: (data as Record<string, unknown>[]) || [],
    };
    await this.cache.set(key, result, this.ttlSeconds);
    return result;
  }
}
