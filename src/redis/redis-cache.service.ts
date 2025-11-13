import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient } from 'ioredis';

/**
 * Lightweight Redis cache wrapper with JSON serialization and namespacing.
 * Falls back silently if Redis connection fails (so local dev without Redis still works).
 */
@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: RedisClient | null = null;
  private enabled = false;
  private readonly prefix: string;

  constructor(private readonly config: ConfigService) {
    this.prefix = this.config.get<string>('REDIS_CACHE_PREFIX') || 'tmc';
  }

  async onModuleInit() {
    const host = this.config.get<string>('REDIS_HOST') || '127.0.0.1';
    const port = parseInt(this.config.get<string>('REDIS_PORT') || '6379', 10);
    const password = this.config.get<string>('REDIS_PASSWORD');
    const db = parseInt(this.config.get<string>('REDIS_DB') || '0', 10);

    try {
      this.client = new Redis({
        host,
        port,
        password,
        db,
        lazyConnect: true,
        maxRetriesPerRequest: 2,
      });
      await this.client.connect();
      this.enabled = true;
      this.logger.log(`Redis cache connected (${host}:${port}/${db})`);
    } catch (err) {
      this.logger.warn(
        `Redis disabled (connection failed): ${(err as Error).message}`,
      );
      this.enabled = false;
      if (this.client) {
        try {
          await this.client.quit();
        } catch {
          /* ignore */
        }
        this.client = null;
      }
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        /* ignore */
      }
    }
  }

  private k(key: string) {
    return `${this.prefix}:${key}`;
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.enabled || !this.client) return null;
    try {
      const raw = await this.client.get(this.k(key));
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (e) {
      this.logger.debug(`Redis get failed for ${key}: ${(e as Error).message}`);
      return null;
    }
  }

  async set<T = any>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.set(
        this.k(key),
        JSON.stringify(value),
        'EX',
        ttlSeconds,
      );
    } catch (e) {
      this.logger.debug(`Redis set failed for ${key}: ${(e as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.del(this.k(key));
    } catch {
      /* ignore */
    }
  }
}
