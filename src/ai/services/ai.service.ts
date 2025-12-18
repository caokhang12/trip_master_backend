import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { OpenRouterService } from './openrouter.service';
import { GeminiService } from './gemini.service';
import { GeneratedItinerary } from '../dto/generated-itinerary.dto';
import Ajv from 'ajv';
import { jsonrepair } from 'jsonrepair';
import * as crypto from 'crypto';
import { RedisCacheService } from '../../redis/redis-cache.service';
import { CacheService } from '../../shared/services/cache.service';
import { normalizeIsoCurrency } from '../../shared/utils/normalization.util';
import { applyCurrencyFallback } from '../utils/itinerary-normalization.util';
import { AiTelemetryService } from 'src/ai/services/ai-telemetry.service';
import type { AiRunEntity } from 'src/schemas/ai-run.entity';
import { getSchemaForTaskType } from 'src/ai/schemas/task-schema.registry';
import { normalizeAiTaskType } from 'src/ai/schemas/ai-task-type';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private ajv: Ajv;

  private isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    if (this.isRecord(err) && typeof err.message === 'string')
      return err.message;
    return 'Unknown error';
  }

  private readonly previewCacheTtlSeconds = process.env
    .AI_PREVIEW_CACHE_TTL_SECONDS
    ? Number(process.env.AI_PREVIEW_CACHE_TTL_SECONDS)
    : 15 * 60;

  constructor(
    private gemini: GeminiService,
    private openRouter: OpenRouterService,
    private redisCache: RedisCacheService,
    private cache: CacheService,
    private telemetry: AiTelemetryService,
  ) {
    this.ajv = new Ajv({ strict: false });
  }

  private hashPrompt(
    prompt: string,
    currencyHint?: string,
    taskType?: string,
  ): string {
    const resolvedTaskType = normalizeAiTaskType(taskType);
    return crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          prompt,
          currencyHint: normalizeIsoCurrency(currencyHint) ?? null,
          taskType: resolvedTaskType,
        }),
      )
      .digest('hex');
  }

  private stripAllItineraryPoi(itinerary: GeneratedItinerary): {
    itinerary: GeneratedItinerary;
    poiStrippedCount: number;
  } {
    let dropped = 0;
    for (const day of itinerary.days ?? []) {
      for (const act of day.activities ?? []) {
        if (act.poi) {
          act.poi = null;
          dropped++;
        }
      }
    }
    return { itinerary, poiStrippedCount: dropped };
  }

  private sanitizeItineraryPoi(itinerary: GeneratedItinerary): {
    itinerary: GeneratedItinerary;
    poiDroppedCount: number;
  } {
    let dropped = 0;
    for (const day of itinerary.days ?? []) {
      for (const act of day.activities ?? []) {
        const poi = act.poi;
        if (!poi) continue;
        const ok =
          typeof poi.placeId === 'string' &&
          typeof poi.name === 'string' &&
          typeof poi.formattedAddress === 'string' &&
          typeof poi.location === 'object' &&
          poi.location !== null &&
          typeof poi.location.lat === 'number' &&
          typeof poi.location.lng === 'number';
        if (!ok) {
          act.poi = null;
          dropped++;
        }
      }
    }
    return { itinerary, poiDroppedCount: dropped };
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
    return {
      daysCount: days.length,
      activitiesCount,
      poiCount,
    };
  }

  private coerceNumber(v: unknown): number | null | undefined {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (!trimmed) return null;
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  private normalizeCurrency(v: unknown): string | null | undefined {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v !== 'string') return null;
    return normalizeIsoCurrency(v) ?? null;
  }

  private normalizeNotes(v: unknown): string[] | null | undefined {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v === 'string') {
      const s = v.trim();
      return s ? [s] : null;
    }
    if (!Array.isArray(v)) return null;
    const out: string[] = [];
    for (const item of v) {
      if (typeof item !== 'string') return null;
      const s = item.trim();
      if (!s) continue;
      out.push(s);
    }
    return out.length > 0 ? out : null;
  }

  private normalizeItineraryBeforeValidate(value: unknown): unknown {
    if (!this.isRecord(value)) return value;

    if (value.notes === undefined && value.rationale !== undefined) {
      value.notes = this.normalizeNotes(value.rationale);
    }

    if (value.totalCost !== undefined) {
      value.totalCost = this.coerceNumber(value.totalCost);
    }
    if (value.currency !== undefined) {
      value.currency = this.normalizeCurrency(value.currency);
    }
    if (value.notes !== undefined) {
      value.notes = this.normalizeNotes(value.notes);
    }

    const days = value.days;
    if (Array.isArray(days)) {
      for (const d of days) {
        if (!this.isRecord(d)) continue;

        if (d.dayNumber !== undefined) {
          const dayNum = this.coerceNumber(d.dayNumber);
          d.dayNumber = dayNum ?? 0;
        }

        if (d.date !== undefined) {
          if (d.date === null) {
            d.date = null;
          } else if (typeof d.date === 'string') {
            const s = d.date.trim();
            d.date = s ? s : null;
          } else {
            d.date = null;
          }
        }

        const activities = d.activities;
        if (!Array.isArray(activities)) continue;

        for (const a of activities) {
          if (!this.isRecord(a)) continue;

          if (a.time !== undefined) {
            if (a.time === null) {
              a.time = null;
            } else if (typeof a.time === 'string') {
              const s = a.time.trim();
              a.time = s ? s : null;
            } else {
              a.time = null;
            }
          }

          if (a.title !== undefined && typeof a.title === 'string') {
            a.title = a.title.trim();
          }

          if (a.description !== undefined) {
            if (a.description === null) {
              a.description = null;
            } else if (typeof a.description === 'string') {
              const s = a.description.trim();
              a.description = s ? s : null;
            } else {
              a.description = null;
            }
          }

          if (a.durationMinutes !== undefined) {
            a.durationMinutes = this.coerceNumber(a.durationMinutes);
          }

          if (a.cost !== undefined) {
            a.cost = this.coerceNumber(a.cost);
          }

          if (a.currency !== undefined) {
            a.currency = this.normalizeCurrency(a.currency);
          }
        }
      }
    }

    return value;
  }

  private extractContent(resp: unknown): string | undefined {
    if (!this.isRecord(resp)) return undefined;

    const choices = resp.choices;
    if (!Array.isArray(choices) || choices.length === 0) return undefined;

    const first: unknown = (choices as unknown[])[0];
    if (!this.isRecord(first)) return undefined;

    const message = first.message;
    if (this.isRecord(message)) {
      const content = message.content;
      if (typeof content === 'string' && content.trim()) return content;
    }

    const text = first.text;
    if (typeof text === 'string' && text.trim()) return text;

    return undefined;
  }

  private createPreviewCacheKey(
    prompt: string,
    currencyHint?: string,
    taskType?: string,
  ): string {
    const resolvedTaskType = normalizeAiTaskType(taskType);
    const payload = {
      prompt,
      currencyHint: normalizeIsoCurrency(currencyHint) ?? null,
      taskType: resolvedTaskType,
    };
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(payload))
      .digest('hex');
    return `ai:preview:${hash}`;
  }

  private tryParseJson(text: string): {
    ok: boolean;
    value: unknown;
    repaired: boolean;
  } {
    if (!text) return { ok: false, value: null, repaired: false };

    const candidates: string[] = [];
    candidates.push(text);

    // try to extract first JSON object or array
    const m = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/m);
    if (m?.[0]) candidates.push(m[0]);

    // remove markdown fences and try again
    const cleaned = text.replace(/```[\s\S]*?```/g, '').trim();
    if (cleaned && cleaned !== text) candidates.push(cleaned);

    const m2 = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/m);
    if (m2?.[0]) candidates.push(m2[0]);

    // de-dupe
    const uniq = Array.from(new Set(candidates)).filter((s) => s.trim());

    for (const c of uniq) {
      try {
        return { ok: true, value: JSON.parse(c) as unknown, repaired: false };
      } catch {
        // try repair then parse
        try {
          const repaired = jsonrepair(c);
          return {
            ok: true,
            value: JSON.parse(repaired) as unknown,
            repaired: true,
          };
        } catch {
          // continue
        }
      }
    }

    return { ok: false, value: null, repaired: false };
  }

  private buildSchemaRepairPrompt(
    originalPrompt: string,
    errorSummary: string,
  ) {
    return [
      originalPrompt,
      '',
      'IMPORTANT: Your previous response did not match the required JSON schema.',
      `Validation errors: ${errorSummary}`,
      'Return exactly one JSON object, no markdown, no code fences, no extra text.',
    ].join('\n');
  }

  private summarizeAjvErrors(): string {
    const errs = this.ajv.errors;
    if (!errs || !Array.isArray(errs) || errs.length === 0) return 'unknown';
    return errs
      .slice(0, 6)
      .map((e) => `${e.instancePath || '/'} ${e.message || ''}`.trim())
      .join('; ');
  }

  /**
   * Generate itinerary using Gemini as primary provider with OpenRouter fallback
   */
  async generateItineraryWithOpenRouter(
    prompt: string,
    options?: {
      currencyHint?: string;
      cacheTtlSeconds?: number;
      requestId?: string;
      userId?: string;
      tripId?: string;
      taskType?: string;
    },
  ): Promise<GeneratedItinerary> {
    const currencyHint = options?.currencyHint;
    const rawTaskType = options?.taskType ?? 'preview_itinerary';
    const resolvedTaskType = normalizeAiTaskType(rawTaskType);
    const cacheKey = this.createPreviewCacheKey(
      prompt,
      currencyHint,
      resolvedTaskType,
    );
    const ttlSeconds =
      options?.cacheTtlSeconds ?? this.previewCacheTtlSeconds ?? 15 * 60;

    const promptHash = this.hashPrompt(prompt, currencyHint, resolvedTaskType);
    const baseRun: Partial<AiRunEntity> = {
      requestId: options?.requestId ?? null,
      userId: options?.userId ?? null,
      tripId: options?.tripId ?? null,
      taskType: rawTaskType,
      promptHash,
      promptLength: prompt.length,
      currencyHint: normalizeIsoCurrency(currencyHint) ?? null,
    };

    let redisHit = false;
    let memoryHit = false;

    try {
      const cachedRedis =
        await this.redisCache.get<GeneratedItinerary>(cacheKey);
      if (cachedRedis) {
        this.logger.debug(`AI preview cache hit (Redis): ${cacheKey}`);
        redisHit = true;
        const cached = applyCurrencyFallback(cachedRedis, currencyHint);
        const stripped = this.stripAllItineraryPoi(cached);
        const sanitized = this.sanitizeItineraryPoi(stripped.itinerary);
        const stats = this.countItineraryStats(sanitized.itinerary);
        void this.telemetry.recordRun({
          ...baseRun,
          cacheRedisHit: true,
          cacheMemoryHit: false,
          provider: 'cache',
          fallbackUsed: false,
          jsonValid: true,
          jsonRepaired: false,
          schemaErrorsCount: 0,
          daysCount: stats.daysCount,
          activitiesCount: stats.activitiesCount,
          poiCount: stats.poiCount,
          poiDroppedCount:
            stripped.poiStrippedCount + sanitized.poiDroppedCount,
        });
        return sanitized.itinerary;
      }

      const cachedMem = this.cache.get<GeneratedItinerary>(cacheKey);
      if (cachedMem) {
        this.logger.debug(`AI preview cache hit (Memory): ${cacheKey}`);
        memoryHit = true;
        const cached = applyCurrencyFallback(cachedMem, currencyHint);
        const stripped = this.stripAllItineraryPoi(cached);
        const sanitized = this.sanitizeItineraryPoi(stripped.itinerary);
        const stats = this.countItineraryStats(sanitized.itinerary);
        void this.telemetry.recordRun({
          ...baseRun,
          cacheRedisHit: false,
          cacheMemoryHit: true,
          provider: 'cache',
          fallbackUsed: false,
          jsonValid: true,
          jsonRepaired: false,
          schemaErrorsCount: 0,
          daysCount: stats.daysCount,
          activitiesCount: stats.activitiesCount,
          poiCount: stats.poiCount,
          poiDroppedCount:
            stripped.poiStrippedCount + sanitized.poiDroppedCount,
        });
        return sanitized.itinerary;
      }
    } catch {
      // ignore cache errors
    }

    const start = Date.now();
    const normCurrency = normalizeIsoCurrency(currencyHint) ?? null;

    let provider: 'Gemini' | 'OpenRouter' | null = null;
    let fallbackUsed = false;
    let responseLength: number | null = null;
    let parseMs: number | null = null;
    let providerMs: number | null = null;
    let jsonRepaired = false;
    let schemaErrorsCount = 0;

    // Try Gemini first
    try {
      this.logger.log('Attempting to generate itinerary with Gemini...');
      const t0 = Date.now();
      const res = await this.generateWithGemini(
        prompt,
        normCurrency ?? undefined,
        resolvedTaskType,
      );
      providerMs = Date.now() - t0;
      provider = 'Gemini';
      responseLength = res.meta.responseLength;
      parseMs = res.meta.parseMs;
      jsonRepaired = res.meta.jsonRepaired;

      await this.redisCache.set(cacheKey, res.itinerary, ttlSeconds);
      this.cache.set(cacheKey, res.itinerary, ttlSeconds * 1000);
      this.logger.log(
        `AI preview generated via Gemini in ${Date.now() - start}ms`,
      );

      const sanitized = this.sanitizeItineraryPoi(res.itinerary);
      const stats = this.countItineraryStats(sanitized.itinerary);
      void this.telemetry.recordRun({
        ...baseRun,
        cacheRedisHit: redisHit,
        cacheMemoryHit: memoryHit,
        provider,
        fallbackUsed,
        totalMs: Date.now() - start,
        providerMs,
        parseMs,
        jsonValid: true,
        jsonRepaired,
        schemaErrorsCount: 0,
        daysCount: stats.daysCount,
        activitiesCount: stats.activitiesCount,
        poiCount: stats.poiCount,
        poiDroppedCount: res.meta.poiStrippedCount + sanitized.poiDroppedCount,
        responseLength,
      });

      return sanitized.itinerary;
    } catch (err: unknown) {
      schemaErrorsCount = Array.isArray(this.ajv.errors)
        ? this.ajv.errors.length
        : 0;
      this.logger.warn(
        `Gemini request failed: ${this.getErrorMessage(err)}. Falling back to OpenRouter...`,
      );
    }

    // Fallback to OpenRouter
    try {
      this.logger.log('Attempting to generate itinerary with OpenRouter...');
      fallbackUsed = true;
      const t0 = Date.now();
      const res = await this.generateWithOpenRouter(
        prompt,
        normCurrency ?? undefined,
        resolvedTaskType,
      );
      providerMs = Date.now() - t0;
      provider = 'OpenRouter';
      responseLength = res.meta.responseLength;
      parseMs = res.meta.parseMs;
      jsonRepaired = res.meta.jsonRepaired;

      await this.redisCache.set(cacheKey, res.itinerary, ttlSeconds);
      this.cache.set(cacheKey, res.itinerary, ttlSeconds * 1000);
      this.logger.log(
        `AI preview generated via OpenRouter in ${Date.now() - start}ms`,
      );

      const sanitized = this.sanitizeItineraryPoi(res.itinerary);
      const stats = this.countItineraryStats(sanitized.itinerary);
      void this.telemetry.recordRun({
        ...baseRun,
        cacheRedisHit: redisHit,
        cacheMemoryHit: memoryHit,
        provider,
        fallbackUsed,
        totalMs: Date.now() - start,
        providerMs,
        parseMs,
        jsonValid: true,
        jsonRepaired,
        schemaErrorsCount: 0,
        daysCount: stats.daysCount,
        activitiesCount: stats.activitiesCount,
        poiCount: stats.poiCount,
        poiDroppedCount: res.meta.poiStrippedCount + sanitized.poiDroppedCount,
        responseLength,
      });

      return sanitized.itinerary;
    } catch (err: unknown) {
      const msg = this.getErrorMessage(err);
      const finalSchemaErrorsCount =
        Array.isArray(this.ajv.errors) && this.ajv.errors.length > 0
          ? this.ajv.errors.length
          : schemaErrorsCount;

      void this.telemetry.recordRun({
        ...baseRun,
        cacheRedisHit: redisHit,
        cacheMemoryHit: memoryHit,
        provider: provider ?? 'OpenRouter',
        fallbackUsed: true,
        totalMs: Date.now() - start,
        providerMs,
        parseMs,
        jsonValid: false,
        jsonRepaired,
        schemaErrorsCount: finalSchemaErrorsCount,
        errorMessage: msg,
        responseLength,
      });

      this.logger.error(`OpenRouter request also failed: ${msg}`, err);
      throw new BadRequestException(
        'Both AI providers failed. Unable to generate itinerary.',
      );
    }
  }

  /**
   * Generate itinerary specifically with Gemini
   * Uses simple string prompt format as per Google Gen AI SDK specs
   */
  private async generateWithGemini(
    prompt: string,
    currencyHint?: string,
    taskType?: string,
  ): Promise<{
    itinerary: GeneratedItinerary;
    meta: {
      responseLength: number;
      parseMs: number;
      jsonRepaired: boolean;
      poiStrippedCount: number;
    };
  }> {
    const attemptOnce = async (p: string) => {
      const payload = {
        messages: [
          {
            role: 'user',
            content: p,
          },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      };
      const resp: unknown = await this.gemini.createChatCompletion(payload);
      return this.parseAndValidateResponse(
        resp,
        'Gemini',
        currencyHint,
        taskType,
      );
    };

    try {
      return await attemptOnce(prompt);
    } catch {
      const errorSummary = this.summarizeAjvErrors();
      this.logger.warn(
        `Gemini schema/parse issue, retrying once: ${errorSummary}`,
      );
      const retryPrompt = this.buildSchemaRepairPrompt(prompt, errorSummary);
      return await attemptOnce(retryPrompt);
    }
  }

  /**
   * Generate itinerary specifically with OpenRouter
   * Uses message array format with system prompt
   */
  private async generateWithOpenRouter(
    prompt: string,
    currencyHint?: string,
    taskType?: string,
  ): Promise<{
    itinerary: GeneratedItinerary;
    meta: {
      responseLength: number;
      parseMs: number;
      jsonRepaired: boolean;
      poiStrippedCount: number;
    };
  }> {
    const attemptOnce = async (p: string) => {
      const payload = {
        messages: [
          {
            role: 'system',
            content:
              'You are a travel assistant that must return pure JSON only.',
          },
          {
            role: 'user',
            content: p,
          },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      };

      const resp: unknown = await this.openRouter.createChatCompletion(payload);
      return this.parseAndValidateResponse(
        resp,
        'OpenRouter',
        currencyHint,
        taskType,
      );
    };

    try {
      return await attemptOnce(prompt);
    } catch {
      const errorSummary = this.summarizeAjvErrors();
      this.logger.warn(
        `OpenRouter schema/parse issue, retrying once: ${errorSummary}`,
      );
      const retryPrompt = this.buildSchemaRepairPrompt(prompt, errorSummary);
      return await attemptOnce(retryPrompt);
    }
  }

  /**
   * Extract content from AI response, parse JSON, and validate against schema
   */
  private parseAndValidateResponse(
    resp: unknown,
    provider: string,
    currencyHint?: string,
    taskType?: string,
  ): {
    itinerary: GeneratedItinerary;
    meta: {
      responseLength: number;
      parseMs: number;
      jsonRepaired: boolean;
      poiStrippedCount: number;
    };
  } {
    const content = this.extractContent(resp);
    if (!content) {
      this.logger.error(`No content in ${provider} response`, resp);
      throw new BadRequestException(`Empty response from ${provider}`);
    }

    const responseLength = content.length;

    const parseStart = Date.now();
    const parsedResult = this.tryParseJson(content);
    const parseMs = Date.now() - parseStart;

    if (!parsedResult.ok) {
      this.logger.warn(
        `Failed to parse ${provider} response as JSON`,
        content.slice(0, 500),
      );
      throw new BadRequestException(`${provider} returned invalid JSON`);
    }

    const normalizedForValidate = this.normalizeItineraryBeforeValidate(
      parsedResult.value,
    );
    const { schema } = getSchemaForTaskType(taskType);
    const validate = this.ajv.validate(
      schema as unknown as object,
      normalizedForValidate,
    );
    if (!validate) {
      this.logger.warn(
        `${provider} JSON failed schema validation`,
        this.ajv.errors,
      );
      throw new BadRequestException(
        `${provider} returned JSON that does not match expected schema`,
      );
    }

    this.logger.log(`Successfully generated itinerary with ${provider}`);

    const normalized = this.normalizeItineraryBeforeValidate(
      parsedResult.value,
    );
    const itinerary = applyCurrencyFallback(
      normalized as GeneratedItinerary,
      currencyHint,
    );

    const stripped = this.stripAllItineraryPoi(itinerary);

    return {
      itinerary: stripped.itinerary,
      meta: {
        responseLength,
        parseMs,
        jsonRepaired: parsedResult.repaired,
        poiStrippedCount: stripped.poiStrippedCount,
      },
    };
  }
}
