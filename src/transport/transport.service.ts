import { Injectable } from '@nestjs/common';
import { RedisCacheService } from '../redis/redis-cache.service';
import { AmadeusApiService } from '../integrations/amadeus/amadeus-api.service';
import { SearchFlightsDto } from './dto/search-flights.dto';

type SearchResult<T> = { count: number; items: T[] };

@Injectable()
export class TransportService {
  private readonly ttlSeconds = 2 * 60 * 60; // 2h
  constructor(
    private readonly cache: RedisCacheService,
    private readonly amadeus: AmadeusApiService,
  ) {}

  async searchFlights(
    dto: SearchFlightsDto,
  ): Promise<SearchResult<Record<string, unknown>>> {
    const key = `flights:search:${dto.originLocationCode}:${dto.destinationLocationCode}:${dto.departureDate}:${dto.returnDate || ''}:${dto.adults}:${dto.nonStop ? '1' : '0'}`;

    const cached =
      await this.cache.get<SearchResult<Record<string, unknown>>>(key);
    if (cached) return cached;

    const data = await this.amadeus.searchFlights({
      originLocationCode: dto.originLocationCode,
      destinationLocationCode: dto.destinationLocationCode,
      departureDate: dto.departureDate,
      returnDate: dto.returnDate,
      adults: dto.adults,
      nonStop: dto.nonStop,
    });
    const result: SearchResult<Record<string, unknown>> = {
      count: Array.isArray(data) ? data.length : 0,
      items: (data as Record<string, unknown>[]) || [],
    };
    await this.cache.set(key, result, this.ttlSeconds);
    return result;
  }
}
