import {
  Controller,
  Get,
  Post,
  Body,
  BadRequestException,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { PreviewItineraryDto } from './dto/preview-itinerary.dto';
import { PromptBuilderService } from './services/prompt-builder.service';
import { AIService } from './services/ai.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { PoiGroundingService } from 'src/ai/services/poi-grounding.service';
import { AdminRoleGuard } from 'src/auth/guards/roles.guard';
import { AiTelemetryService } from 'src/ai/services/ai-telemetry.service';
import { ResponseUtil } from 'src/shared/utils/response.util';
import { RedisCacheService } from 'src/redis/redis-cache.service';
import { CacheService } from 'src/shared/services/cache.service';
import type { GeneratedItinerary } from 'src/ai/dto/generated-itinerary.dto';
import { normalizeIsoCurrency } from 'src/shared/utils/normalization.util';

type AiRequest = Request & {
  requestId?: string;
  user?: { id?: string };
};

@Controller('ai')
@ApiBearerAuth()
export class AIController {
  private readonly groundedCacheTtlSeconds = process.env
    .AI_GROUNDED_CACHE_TTL_SECONDS
    ? Number(process.env.AI_GROUNDED_CACHE_TTL_SECONDS)
    : process.env.AI_PREVIEW_CACHE_TTL_SECONDS
      ? Number(process.env.AI_PREVIEW_CACHE_TTL_SECONDS)
      : 15 * 60;

  constructor(
    private promptBuilder: PromptBuilderService,
    private aiService: AIService,
    private poiGroundingService: PoiGroundingService,
    private telemetry: AiTelemetryService,
    private redisCache: RedisCacheService,
    private cache: CacheService,
  ) {}

  private createGroundedCacheKey(payload: unknown): string {
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(payload))
      .digest('hex');
    return `ai:preview:grounded:v1:${hash}`;
  }

  private hashPrompt(prompt: string, currencyHint?: string): string {
    return crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          prompt,
          currencyHint: normalizeIsoCurrency(currencyHint) ?? null,
        }),
      )
      .digest('hex');
  }

  private countItineraryStats(itinerary: GeneratedItinerary): {
    daysCount: number;
    activitiesCount: number;
    poiCount: number;
  } {
    const days = itinerary.days ?? [];
    let activitiesCount = 0;
    let poiCount = 0;
    for (const d of days) {
      const acts = d.activities ?? [];
      activitiesCount += acts.length;
      for (const a of acts) {
        if (a.poi) poiCount++;
      }
    }
    return { daysCount: days.length, activitiesCount, poiCount };
  }

  @UseGuards(AdminRoleGuard)
  @Get('admin/runs/recent')
  async adminRecentRuns(@Query('limit') limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : 50;
    const runs = await this.telemetry.listRecent(parsed);
    return ResponseUtil.success(runs);
  }

  @Post('preview-itinerary')
  async previewItinerary(
    @Req() req: AiRequest,
    @Body() body: PreviewItineraryDto,
  ) {
    try {
      const start = Date.now();
      const taskType = 'preview_itinerary';
      const prompt = this.promptBuilder.buildPrompt(taskType, body);

      const groundingOptions = {
        language: 'en',
        radiusMeters: 8000,
        maxActivitiesToGroundPerDay: 6,
        mode: 'thin' as const,
      };

      const groundedCacheKey = this.createGroundedCacheKey({
        destination: body.destination,
        prompt,
        currencyHint: body.currency ?? null,
        grounding: groundingOptions,
      });

      try {
        const cachedRedis =
          await this.redisCache.get<GeneratedItinerary>(groundedCacheKey);
        if (cachedRedis) {
          const stats = this.countItineraryStats(cachedRedis);
          void this.telemetry.recordRun({
            requestId: req.requestId ?? null,
            userId: req.user?.id ?? null,
            tripId: null,
            taskType: 'preview_itinerary',
            provider: 'cache_grounded',
            fallbackUsed: false,
            cacheRedisHit: true,
            cacheMemoryHit: false,
            totalMs: Date.now() - start,
            providerMs: null,
            parseMs: null,
            jsonValid: true,
            jsonRepaired: false,
            schemaErrorsCount: 0,
            daysCount: stats.daysCount,
            activitiesCount: stats.activitiesCount,
            poiCount: stats.poiCount,
            poiDroppedCount: 0,
            promptHash: this.hashPrompt(prompt, body.currency),
            promptLength: prompt.length,
            responseLength: null,
            currencyHint: normalizeIsoCurrency(body.currency) ?? null,
            errorMessage: null,
          });
          return ResponseUtil.success(cachedRedis);
        }

        const cachedMem = this.cache.get<GeneratedItinerary>(groundedCacheKey);
        if (cachedMem) {
          const stats = this.countItineraryStats(cachedMem);
          void this.telemetry.recordRun({
            requestId: req.requestId ?? null,
            userId: req.user?.id ?? null,
            tripId: null,
            taskType: 'preview_itinerary',
            provider: 'cache_grounded',
            fallbackUsed: false,
            cacheRedisHit: false,
            cacheMemoryHit: true,
            totalMs: Date.now() - start,
            providerMs: null,
            parseMs: null,
            jsonValid: true,
            jsonRepaired: false,
            schemaErrorsCount: 0,
            daysCount: stats.daysCount,
            activitiesCount: stats.activitiesCount,
            poiCount: stats.poiCount,
            poiDroppedCount: 0,
            promptHash: this.hashPrompt(prompt, body.currency),
            promptLength: prompt.length,
            responseLength: null,
            currencyHint: normalizeIsoCurrency(body.currency) ?? null,
            errorMessage: null,
          });
          return ResponseUtil.success(cachedMem);
        }
      } catch {
        // ignore cache errors
      }

      const result = await this.aiService.generateItineraryWithOpenRouter(
        prompt,
        {
          currencyHint: body.currency,
          requestId: req.requestId,
          userId: req.user?.id,
          taskType,
        },
      );

      const grounded = await this.poiGroundingService.groundItinerary(
        body.destination,
        result,
        groundingOptions,
      );

      const stats = this.countItineraryStats(grounded);
      if (req.requestId) {
        void this.telemetry.updateLatestByRequestId(req.requestId, {
          daysCount: stats.daysCount,
          activitiesCount: stats.activitiesCount,
          poiCount: stats.poiCount,
        });
      }

      try {
        await this.redisCache.set(
          groundedCacheKey,
          grounded,
          this.groundedCacheTtlSeconds,
        );
        this.cache.set(
          groundedCacheKey,
          grounded,
          this.groundedCacheTtlSeconds * 1000,
        );
      } catch {
        // ignore cache errors
      }

      return ResponseUtil.success(grounded);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI preview failed';
      throw new BadRequestException(message);
    }
  }
}
