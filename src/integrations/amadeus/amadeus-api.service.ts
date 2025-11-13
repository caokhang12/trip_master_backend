import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AmadeusAuthService } from './amadeus-auth.service';

@Injectable()
export class AmadeusApiService {
  private readonly logger = new Logger(AmadeusApiService.name);

  constructor(
    private readonly auth: AmadeusAuthService,
    private readonly config: ConfigService,
  ) {}

  private getBaseUrl(): string {
    const baseUrlFromConfig = this.config.get<string>('amadeus.baseUrl');
    return baseUrlFromConfig || 'https://test.api.amadeus.com';
  }

  // Hotel Services
  async searchHotelsByCity(
    params: Record<string, unknown>,
  ): Promise<unknown[]> {
    const token = await this.auth.getAccessToken();
    const url = `${this.getBaseUrl()}/v1/reference-data/locations/hotels/by-city`;
    try {
      const resp = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      const data = resp.data as { data?: unknown[] };
      return data.data ?? [];
    } catch (error: unknown) {
      const err = error as { message?: string };
      this.logger.error(
        `Amadeus searchHotels failed: ${err?.message || 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getMultiHotelOffers(
    params: Record<string, unknown>,
  ): Promise<unknown[]> {
    const token = await this.auth.getAccessToken();
    const url = `${this.getBaseUrl()}/v3/shopping/hotel-offers`;
    try {
      const resp = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      const data = resp.data as { data?: unknown[] };
      return data.data ?? [];
    } catch (error: unknown) {
      const err = error as { message?: string };
      this.logger.error(
        `Amadeus getMultiHotelOffers failed: ${err?.message || 'Unknown error'}`,
      );
      throw error;
    }
  }

  async createHotelBooking(payload: Record<string, unknown>): Promise<unknown> {
    const token = await this.auth.getAccessToken();
    const url = `${this.getBaseUrl()}/v1/booking/hotel-bookings`;
    try {
      const resp = await axios.post(
        url,
        { data: payload },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return resp.data;
    } catch (error: unknown) {
      const err = error as { message?: string };
      this.logger.error(
        `Amadeus createHotelBooking failed: ${err?.message || 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Flight Services
  async searchFlights(params: Record<string, unknown>): Promise<unknown[]> {
    const token = await this.auth.getAccessToken();
    const url = `${this.getBaseUrl()}/v2/shopping/flight-offers`;
    try {
      const resp = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params,
      });
      const data = resp.data as { data?: unknown[] };
      return data.data ?? [];
    } catch (error: unknown) {
      const err = error as { message?: string };
      this.logger.error(
        `Amadeus searchFlights failed: ${err?.message || 'Unknown error'}`,
      );
      throw error;
    }
  }
}
