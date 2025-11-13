import { registerAs } from '@nestjs/config';

export default registerAs('amadeus', () => ({
  clientId: process.env.AMADEUS_API_KEY,
  clientSecret: process.env.AMADEUS_API_SECRET,
  hostname: process.env.AMADEUS_HOSTNAME || 'test',
  baseUrl: process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com',
}));
