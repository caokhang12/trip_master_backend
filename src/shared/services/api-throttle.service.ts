import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
  | 'goong'
  | 'geoapify'
  | 'openweather'
  | 'exchangerate'
  | 'nominatim'
  | 'cloudinary'
  | 'openai';

/**
 * Service to monitor and throttle API usage to stay within free tier limits
 */
@Injectable()
export class APIThrottleService {
  private readonly logger = new Logger(APIThrottleService.name);

  private readonly limits: Record<SupportedServices, ServiceLimits> = {
    goong: { daily: 1000, hourly: 100 },
    geoapify: { daily: 3000, hourly: 500 },
    openweather: { daily: 1000, hourly: 100 },
    exchangerate: { monthly: 1500, daily: 50 },
    nominatim: { daily: 10000, hourly: 1000 }, // Very generous limits
    cloudinary: { daily: 2000, monthly: 25000 }, // Free tier: 25GB storage, 25GB bandwidth
    openai: { daily: 100, hourly: 10 }, // Conservative limits for cost control
  };

  // In-memory storage for development - should use Redis in production
  private usage: Record<string, UsageCounters> = {};
  private lastReset: Record<string, Date> = {};

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

    // Increment usage
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
  getTimeUntilReset(service: string, userId?: string) {
    const now = new Date();
    const serviceKey = `${service}_${userId || 'global'}`;
    const lastReset = this.lastReset[serviceKey] || now;

    const nextHourReset = new Date(now);
    nextHourReset.setMinutes(0, 0, 0);
    nextHourReset.setHours(nextHourReset.getHours() + 1);

    const nextDayReset = new Date(now);
    nextDayReset.setHours(0, 0, 0, 0);
    nextDayReset.setDate(nextDayReset.getDate() + 1);

    const nextMonthReset = new Date(lastReset);
    nextMonthReset.setMonth(nextMonthReset.getMonth() + 1);

    return {
      hourly: Math.max(0, nextHourReset.getTime() - now.getTime()),
      daily: Math.max(0, nextDayReset.getTime() - now.getTime()),
      monthly: Math.max(0, nextMonthReset.getTime() - now.getTime()),
    };
  }

  /**
   * Check OpenAI rate limits and track usage with error handling
   */
  checkRateLimit(userId: string, requestType: string): void {
    const canUse = this.checkAndLog('openai', userId);
    if (!canUse) {
      const stats = this.getUsageStats('openai', userId);
      this.logger.warn(`Rate limit check for ${requestType}`);
      throw new BadRequestException(
        `OpenAI rate limit exceeded. Current usage: ${stats.usage.hourly}/${stats.limits?.hourly} hourly, ${stats.usage.daily}/${stats.limits?.daily} daily`,
      );
    }
  }

  /**
   * Log OpenAI API usage with token and cost tracking
   */
  logUsage(userId: string, metrics: AIUsageMetrics): void {
    try {
      // Log basic usage through existing system
      this.checkAndLog('openai', userId);

      // Additional logging for cost tracking
      this.logger.debug(
        `OpenAI usage logged for user ${userId}: ${metrics.tokensUsed} tokens, $${metrics.cost.toFixed(4)} cost, type: ${metrics.requestType}`,
      );

      if (!metrics.success) {
        this.logger.warn(
          `Failed OpenAI request for user ${userId}: ${metrics.requestType}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to log OpenAI usage for user ${userId}: ${errorMessage}`,
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
  canMakeOpenAIRequest(userId: string): boolean {
    return this.checkAndLog('openai', userId);
  }

  /**
   * Get OpenAI usage statistics for user
   */
  getOpenAIUsageStats(userId: string) {
    return this.getUsageStats('openai', userId);
  }
}
