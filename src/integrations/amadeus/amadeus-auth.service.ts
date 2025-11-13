import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AmadeusAuthService {
  private readonly logger = new Logger(AmadeusAuthService.name);
  private token: string | null = null;
  private expiry = 0;

  constructor(private readonly config: ConfigService) {}

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.token && now < this.expiry) {
      return this.token;
    }

    const clientId = this.config.get<string>('amadeus.clientId');
    const clientSecret = this.config.get<string>('amadeus.clientSecret');

    // const hostnameFromConfig = this.config.get<string>('amadeus.hostname');
    // const env = (
    //   this.config.get<string>('amadeus.environment') || 'test'
    // ).toLowerCase();
    // const defaultHost =
    //   env === 'production'
    //     ? 'https://api.amadeus.com'
    //     : 'https://test.api.amadeus.com';
    // const hostname = hostnameFromConfig || defaultHost;
    const url = `https://test.api.amadeus.com/v1/security/oauth2/token`;

    try {
      if (!clientId || !clientSecret) {
        throw new Error(
          'Missing Amadeus clientId or clientSecret in configuration',
        );
      }

      // Amadeus expects application/x-www-form-urlencoded with grant_type, client_id and client_secret
      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      });

      const response = await axios.post(url, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10_000,
      });
      const data = response.data as {
        access_token: string;
        expires_in: number;
      };

      this.token = data.access_token;
      // Subtract 60s for safety margin, but ensure expiry is in the future
      const calculatedExpiry = now + data.expires_in * 1000 - 60 * 1000;
      this.expiry = Math.max(calculatedExpiry, now + 5 * 1000);
      this.logger.log('Acquired new Amadeus access token');
      return this.token;
    } catch (error: unknown) {
      const err = error as { message?: string };
      this.logger.error(
        `Failed to fetch Amadeus token: ${err?.message || 'Unknown error'}`,
      );
      throw error;
    }
  }
}
