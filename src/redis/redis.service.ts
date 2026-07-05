import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      maxRetriesPerRequest: null,
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  // Cache-aside pattern helpers
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 300,
  ): Promise<T> {
    const cached = await this.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    const data = await fetchFn();
    await this.set(key, JSON.stringify(data), ttlSeconds);
    return data;
  }

  async getOrSetMany<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    const results = await this.client.mget(...keys);
    return results.map((r) => (r ? JSON.parse(r) : null));
  }

  async setMany(keyValues: Record<string, unknown>, ttlSeconds?: number): Promise<void> {
    const pipeline = this.client.pipeline();
    for (const [key, value] of Object.entries(keyValues)) {
      if (ttlSeconds) {
        pipeline.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } else {
        pipeline.set(key, JSON.stringify(value));
      }
    }
    await pipeline.exec();
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}
