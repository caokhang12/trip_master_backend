import { registerAs } from '@nestjs/config';

export default registerAs('googleMaps', () => ({
  apiKey: process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY,
  defaultRegion: process.env.GOOGLE_MAPS_DEFAULT_REGION || 'US',
  cacheTtl: {
    placeDetails: parseInt(
      process.env.GOOGLE_MAPS_CACHE_TTL_PLACE_DETAILS || '86400',
      10,
    ), // 24 hours
    geocoding: parseInt(
      process.env.GOOGLE_MAPS_CACHE_TTL_GEOCODING || '86400',
      10,
    ), // 24 hours
    reverseGeocoding: parseInt(
      process.env.GOOGLE_MAPS_CACHE_TTL_REVERSE_GEOCODING || '86400',
      10,
    ), // 24 hours
    directions: parseInt(
      process.env.GOOGLE_MAPS_CACHE_TTL_DIRECTIONS || '3600',
      10,
    ), // 1 hour
    distanceMatrix: parseInt(
      process.env.GOOGLE_MAPS_CACHE_TTL_DISTANCE_MATRIX || '600',
      10,
    ), // 10 minutes
  },
  timeout: parseInt(process.env.GOOGLE_MAPS_TIMEOUT || '5000', 10), // 5 seconds
  maxRetries: parseInt(process.env.GOOGLE_MAPS_MAX_RETRIES || '2', 10),
}));
