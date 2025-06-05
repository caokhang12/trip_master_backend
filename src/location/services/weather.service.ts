import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { APIThrottleService } from '../../shared/services/api-throttle.service';
import { ErrorUtilService } from '../../shared/utils/error.util';

export interface WeatherCurrent {
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  visibility: number;
}

export interface WeatherForecast {
  date: string;
  temperature: {
    min: number;
    max: number;
  };
  description: string;
  icon: string;
  humidity: number;
  chanceOfRain: number;
}

export interface VietnamSeasonInfo {
  season: 'dry' | 'rainy';
  bestForTravel: boolean;
  packingTips: string[];
}

export interface WeatherResponse {
  current: WeatherCurrent;
  forecast: WeatherForecast[];
  location: {
    lat: number;
    lng: number;
    name: string;
  };
  vietnamSeasonInfo?: VietnamSeasonInfo;
}

// OpenWeatherMap API response interfaces
interface OpenWeatherMapCurrentResponse {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  wind?: {
    speed: number;
    deg: number;
  };
  visibility?: number;
  name: string;
  sys: {
    country: string;
  };
}

interface OpenWeatherMapForecastResponse {
  list: Array<{
    dt: number;
    main: {
      temp: number;
      temp_min: number;
      temp_max: number;
      humidity: number;
    };
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    wind?: {
      speed: number;
      deg: number;
    };
    rain?: {
      '3h': number;
    };
    dt_txt: string;
  }>;
  city: {
    name: string;
    country: string;
  };
}

interface OpenWeatherMapGeocodingResponse {
  name: string;
  local_names?: Record<string, string>;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

/**
 * Weather service using OpenWeatherMap API with Vietnam-specific insights
 */
@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(
    private configService: ConfigService,
    private apiThrottleService: APIThrottleService,
  ) {}

  /**
   * Get current weather and forecast for location
   */
  async getWeather(
    lat: number,
    lng: number,
    includeForecast: boolean = true,
    includeVietnamInfo: boolean = true,
  ): Promise<WeatherResponse> {
    try {
      this.logger.log(`Getting weather for ${lat},${lng}`);

      if (!this.apiThrottleService.checkAndLog('openweather')) {
        throw new HttpException(
          'Weather service temporarily unavailable due to rate limits',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const apiKey = this.configService.get<string>('OPENWEATHER_API_KEY');
      if (!apiKey) {
        throw new HttpException(
          'Weather service not configured',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // Get current weather
      const currentWeather = await this.getCurrentWeather(lat, lng, apiKey);

      // Get forecast if requested
      let forecast: WeatherForecast[] = [];
      if (includeForecast) {
        forecast = await this.getWeatherForecast(lat, lng, apiKey);
      }

      // Get location name
      const locationName = await this.getLocationName(lat, lng, apiKey);

      // Add Vietnam-specific information if in Vietnam
      let vietnamSeasonInfo: VietnamSeasonInfo | undefined;
      if (includeVietnamInfo && this.isInVietnam(lat, lng)) {
        vietnamSeasonInfo = this.getVietnameseSeasonInfo(
          new Date(),
          currentWeather,
        );
      }

      return {
        current: currentWeather,
        forecast,
        location: {
          lat,
          lng,
          name: locationName,
        },
        vietnamSeasonInfo,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Weather service error: ${ErrorUtilService.getErrorMessage(error)}`,
        ErrorUtilService.getErrorStack(error),
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Weather service temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Get current weather from OpenWeatherMap
   */
  private async getCurrentWeather(
    lat: number,
    lng: number,
    apiKey: string,
  ): Promise<WeatherCurrent> {
    const response = await axios.get<OpenWeatherMapCurrentResponse>(
      'https://api.openweathermap.org/data/2.5/weather',
      {
        params: {
          lat,
          lon: lng,
          appid: apiKey,
          units: 'metric',
        },
        timeout: 5000,
      },
    );

    const data = response.data;

    return {
      temperature: Math.round(data.main.temp * 10) / 10,
      feelsLike: Math.round(data.main.feels_like * 10) / 10,
      humidity: data.main.humidity,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      windSpeed: data.wind?.speed || 0,
      visibility: data.visibility || 10000,
    };
  }

  /**
   * Get 7-day weather forecast
   */
  private async getWeatherForecast(
    lat: number,
    lng: number,
    apiKey: string,
  ): Promise<WeatherForecast[]> {
    const response = await axios.get<OpenWeatherMapForecastResponse>(
      'https://api.openweathermap.org/data/2.5/forecast',
      {
        params: {
          lat,
          lon: lng,
          appid: apiKey,
          units: 'metric',
        },
        timeout: 5000,
      },
    );

    const forecasts = response.data.list;
    const dailyForecasts: WeatherForecast[] = [];
    const processedDates = new Set<string>();

    for (const forecast of forecasts) {
      const date = new Date(forecast.dt * 1000);
      const dateStr = date.toISOString().split('T')[0];

      if (!processedDates.has(dateStr) && dailyForecasts.length < 7) {
        processedDates.add(dateStr);

        // Get min/max temps for the day
        const dayForecasts = forecasts.filter((f) => {
          const fDate = new Date(f.dt * 1000).toISOString().split('T')[0];
          return fDate === dateStr;
        });

        const temps = dayForecasts.map((f) => f.main.temp);
        const humidities = dayForecasts.map((f) => f.main.humidity);
        const rainChances = dayForecasts.map((f) =>
          f.rain ? Math.min(100, (f.rain['3h'] || 0) * 10) : 0,
        );

        dailyForecasts.push({
          date: dateStr,
          temperature: {
            min: Math.round(Math.min(...temps) * 10) / 10,
            max: Math.round(Math.max(...temps) * 10) / 10,
          },
          description: forecast.weather[0].description,
          icon: forecast.weather[0].icon,
          humidity: Math.round(
            humidities.reduce((a, b) => a + b, 0) / humidities.length,
          ),
          chanceOfRain: Math.round(Math.max(...rainChances)),
        });
      }
    }

    return dailyForecasts;
  }

  /**
   * Get location name from coordinates
   */
  private async getLocationName(
    lat: number,
    lng: number,
    apiKey: string,
  ): Promise<string> {
    try {
      const response = await axios.get<OpenWeatherMapGeocodingResponse[]>(
        'https://api.openweathermap.org/geo/1.0/reverse',
        {
          params: {
            lat,
            lon: lng,
            limit: 1,
            appid: apiKey,
          },
          timeout: 3000,
        },
      );

      const location = response.data[0];
      if (location) {
        return `${location.name}${location.state ? `, ${location.state}` : ''}, ${location.country}`;
      }
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to get location name: ${ErrorUtilService.getErrorMessage(error)}`,
      );
    }

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  /**
   * Check if coordinates are within Vietnam
   */
  private isInVietnam(lat: number, lng: number): boolean {
    // Vietnam bounding box (approximate)
    const vietnamBounds = {
      north: 23.3,
      south: 8.5,
      east: 109.5,
      west: 102.0,
    };

    return (
      lat >= vietnamBounds.south &&
      lat <= vietnamBounds.north &&
      lng >= vietnamBounds.west &&
      lng <= vietnamBounds.east
    );
  }

  /**
   * Get Vietnam-specific seasonal information and travel tips
   */
  private getVietnameseSeasonInfo(
    date: Date,
    currentWeather: WeatherCurrent,
  ): VietnamSeasonInfo {
    const month = date.getMonth() + 1; // 1-12

    // Vietnam has two main seasons
    const isDrySeason = month >= 11 || month <= 4; // Nov-Apr
    const isRainySeason = month >= 5 && month <= 10; // May-Oct

    const season = isDrySeason ? 'dry' : 'rainy';

    // Determine if it's good for travel
    const bestForTravel =
      isDrySeason ||
      (isRainySeason &&
        currentWeather.humidity < 80 &&
        currentWeather.temperature < 32);

    // Generate packing tips based on season and current weather
    const packingTips: string[] = [];

    if (season === 'rainy') {
      packingTips.push('Bring waterproof jacket');
      packingTips.push('Pack umbrella');
      packingTips.push('Quick-dry clothing recommended');
    }

    if (currentWeather.temperature > 30) {
      packingTips.push('Light, breathable clothing');
      packingTips.push('Sun protection (hat, sunscreen)');
      packingTips.push('Stay hydrated');
    }

    if (currentWeather.humidity > 80) {
      packingTips.push('Moisture-wicking fabrics');
      packingTips.push('Extra change of clothes');
    }

    if (season === 'dry') {
      packingTips.push('Comfortable walking shoes');
      packingTips.push('Light layers for temperature changes');
    }

    // Always useful in Vietnam
    packingTips.push('Insect repellent');
    packingTips.push('Comfortable sandals');

    return {
      season,
      bestForTravel,
      packingTips: [...new Set(packingTips)], // Remove duplicates
    };
  }
}
