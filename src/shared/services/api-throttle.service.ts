import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIUsageMetrics } from '../../ai/interfaces/ai.interface';

interface ServiceLimits {
  daily?: number;
  hourly?: number;
  monthly?: number;
}

interface UsageCounters {
  hourly: number;
  daily: number;
  monthly: number;
}

type SupportedServices =
  | 'openweather'
  | 'exchangerate'
  | 'nominatim'
  | 'cloudinary'
  | 'openai'
  | 'google_places';

/**
 * Service to monitor and throttle API usage to stay within free tier limits
 */
@Injectable()
export class APIThrottleService {
  private readonly logger = new Logger(APIThrottleService.name);

  private readonly limits: Record<SupportedServices, ServiceLimits>;

  // In-memory storage for development - should move to Redis (atomic counters) in production
  private usage: Record<string, UsageCounters> = {};
  private lastReset: Record<string, Date> = {};

  constructor(private readonly config: ConfigService) {
    // Load limits with environment override (fallback to safe defaults)
    this.limits = {
      openweather: {
        daily: this.num('LIMIT_OPENWEATHER_DAILY', 1000),
        hourly: this.num('LIMIT_OPENWEATHER_HOURLY', 100),
      },
      exchangerate: {
        monthly: this.num('LIMIT_EXCHANGERATE_MONTHLY', 1500),
        daily: this.num('LIMIT_EXCHANGERATE_DAILY', 50),
      },
      nominatim: {
        daily: this.num('LIMIT_NOMINATIM_DAILY', 10000),
        hourly: this.num('LIMIT_NOMINATIM_HOURLY', 1000),
      },
      cloudinary: {
        daily: this.num('LIMIT_CLOUDINARY_DAILY', 2000),
        monthly: this.num('LIMIT_CLOUDINARY_MONTHLY', 25000),
      },
      openai: {
        daily: this.num('LIMIT_OPENAI_DAILY', 100),
        hourly: this.num('LIMIT_OPENAI_HOURLY', 10),
      },
      google_places: {
        daily: this.num('LIMIT_GOOGLE_PLACES_DAILY', 500),
        hourly: this.num('LIMIT_GOOGLE_PLACES_HOURLY', 100),
      },
    } as const;
  }

  private num(key: string, fallback: number): number {
    const val = this.config.get<string | number>(key);
    const parsed = typeof val === 'string' ? parseInt(val, 10) : val;
    return Number.isFinite(parsed as number) ? (parsed as number) : fallback;
  }

  /**
   * Check if API service can be used and log usage
   * @param service - API service name
   * @param userId - Optional user ID for tracking
   * @returns boolean - true if API can be used
   */
  checkAndLog(service: string, userId?: string): boolean {
    const now = new Date();
    const serviceKey = `${service}_${userId || 'global'}`;

    // Initialize usage tracking
    if (!this.usage[serviceKey]) {
      this.usage[serviceKey] = { hourly: 0, daily: 0, monthly: 0 };
      this.lastReset[serviceKey] = now;
    }

    // Reset counters based on time
    this.resetCountersIfNeeded(serviceKey, now);

    const serviceUsage = this.usage[serviceKey];
    const serviceLimits = this.limits[service as SupportedServices];

    if (!serviceLimits) {
      this.logger.warn(`Unknown service: ${service}`);
      return true; // Allow unknown services
    }

    // Check limits
    const hourlyExceeded =
      serviceLimits.hourly && serviceUsage.hourly >= serviceLimits.hourly;
    const dailyExceeded =
      serviceLimits.daily && serviceUsage.daily >= serviceLimits.daily;
    const monthlyExceeded =
      serviceLimits.monthly && serviceUsage.monthly >= serviceLimits.monthly;

    if (hourlyExceeded || dailyExceeded || monthlyExceeded) {
      this.logger.warn(`API limit exceeded for ${service}`, {
        service,
        userId,
        hourly: serviceUsage.hourly,
        daily: serviceUsage.daily,
        monthly: serviceUsage.monthly,
        limits: serviceLimits,
      });
      return false;
    }

    // Increment usage (one atomic logical operation; for Redis we'd use INCR + TTL buckets)
    serviceUsage.hourly++;
    serviceUsage.daily++;
    serviceUsage.monthly++;

    // Log usage at 80% threshold
    this.logUsageWarnings(service, serviceUsage, serviceLimits);

    return true;
  }

  /**
   * Get current usage statistics for a service
   * @param service - API service name
   * @param userId - Optional user ID
   * @returns Usage statistics
   */
  getUsageStats(service: string, userId?: string) {
    const serviceKey = `${service}_${userId || 'global'}`;
    const serviceUsage = this.usage[serviceKey] || {
      hourly: 0,
      daily: 0,
      monthly: 0,
    };
    const serviceLimits = this.limits[service as keyof typeof this.limits];

    return {
      service,
      userId,
      usage: serviceUsage,
      limits: serviceLimits,
      percentageUsed: serviceLimits
        ? {
            hourly: serviceLimits.hourly
              ? (serviceUsage.hourly / serviceLimits.hourly) * 100
              : 0,
            daily: serviceLimits.daily
              ? (serviceUsage.daily / serviceLimits.daily) * 100
              : 0,
            monthly: serviceLimits.monthly
              ? (serviceUsage.monthly / serviceLimits.monthly) * 100
              : 0,
          }
        : null,
    };
  }

  /**
   * Reset usage counters based on time elapsed
   */
  private resetCountersIfNeeded(serviceKey: string, now: Date): void {
    const lastReset = this.lastReset[serviceKey];
    const hoursSinceReset =
      (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
    const daysSinceReset = hoursSinceReset / 24;
    const monthsSinceReset = daysSinceReset / 30;

    if (hoursSinceReset >= 1) {
      this.usage[serviceKey].hourly = 0;
    }

    if (daysSinceReset >= 1) {
      this.usage[serviceKey].daily = 0;
    }

    if (monthsSinceReset >= 1) {
      this.usage[serviceKey].monthly = 0;
      this.lastReset[serviceKey] = now;
    }
  }

  /**
   * Log warnings when approaching API limits
   */
  private logUsageWarnings(
    service: string,
    usage: UsageCounters,
    limits: ServiceLimits,
  ): void {
    const thresholds = [0.8, 0.9, 0.95]; // 80%, 90%, 95%

    for (const threshold of thresholds) {
      if (limits.hourly && usage.hourly >= limits.hourly * threshold) {
        this.logger.warn(
          `${service} API hourly usage at ${threshold * 100}%: ${usage.hourly}/${limits.hourly}`,
        );
      }
      if (limits.daily && usage.daily >= limits.daily * threshold) {
        this.logger.warn(
          `${service} API daily usage at ${threshold * 100}%: ${usage.daily}/${limits.daily}`,
        );
      }
      if (limits.monthly && usage.monthly >= limits.monthly * threshold) {
        this.logger.warn(
          `${service} API monthly usage at ${threshold * 100}%: ${usage.monthly}/${limits.monthly}`,
        );
      }
    }
  }

  /**
   * Get time until next reset for different periods
   */
  /** Remaining quota percentages (0-100) */
  getRemainingPercent(service: string, userId?: string) {
    const stats = this.getUsageStats(service, userId);
    if (!stats.limits) return null;
    const { usage, limits } = stats;
    return {
      hourly: limits.hourly
        ? Math.max(0, 100 - (usage.hourly / limits.hourly) * 100)
        : null,
      daily: limits.daily
        ? Math.max(0, 100 - (usage.daily / limits.daily) * 100)
        : null,
      monthly: limits.monthly
        ? Math.max(0, 100 - (usage.monthly / limits.monthly) * 100)
        : null,
    };
  }

  /**
   * Check OpenAI rate limits and track usage with error handling
   */
  checkRateLimit(userId: string, requestType: string): void {
    const allowed = this.checkAndLog('openai', userId);
    if (!allowed) {
      const stats = this.getUsageStats('openai', userId);
      this.logger.warn(`OpenAI rate limit exceeded for ${requestType}`);
      throw new BadRequestException(
        `OpenAI quota exceeded: ${stats.usage.hourly}/${stats.limits?.hourly} hourly, ${stats.usage.daily}/${stats.limits?.daily} daily`,
      );
    }
  }

  /**
   * Log OpenAI API usage with token and cost tracking
   */
  logUsage(userId: string, metrics: AIUsageMetrics): void {
    // IMPORTANT: no quota increment here (avoid double counting). Only logging metadata.
    this.logger.debug(
      `OpenAI usage: user=${userId} type=${metrics.requestType} tokens=${metrics.tokensUsed} cost=$${metrics.cost.toFixed(4)} success=${metrics.success}`,
    );
    if (!metrics.success) {
      this.logger.warn(
        `OpenAI request failed (post-count): user=${userId} type=${metrics.requestType}`,
      );
    }
  }

  /**
   * Calculate estimated cost for OpenAI request
   */
  calculateOpenAICost(tokens: number, model: string = 'gpt-3.5-turbo'): number {
    // GPT-3.5-turbo pricing (approximate average for input/output)
    const costPerToken = model.includes('gpt-4') ? 0.00006 : 0.000002;
    return tokens * costPerToken;
  }

  /**
   * Check if user can make OpenAI request
   */
  // Convenience wrappers (optional future UI integration)
  getOpenAIStats(userId: string) {
    return this.getUsageStats('openai', userId);
  }
  getGooglePlacesStats(userId?: string) {
    return this.getUsageStats('google_places', userId);
  }
}
