import { Injectable, Logger } from '@nestjs/common';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || '';

@Injectable()
export class CacheProvider {
  private redis: IORedis | null = null;
  private mem = new Map<string, { value: any; expiresAt: number }>();
  private readonly logger = new Logger(CacheProvider.name);

  constructor() {
    if (REDIS_URL) {
      this.redis = new IORedis(REDIS_URL);
      this.logger.log(`Redis enabled: ${REDIS_URL}`);
    } else {
      this.logger.log('Redis disabled → using in-memory cache.');
    }
  }

  async set(key: string, value: any, ttlSec = 300) {
    const str = JSON.stringify(value);
    if (this.redis) {
      await this.redis.set(key, str, 'EX', ttlSec);
    } else {
      this.mem.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (this.redis) {
      const v = await this.redis.get(key);
      return v ? JSON.parse(v) : null;
    } else {
      const rec = this.mem.get(key);
      if (!rec) return null;
      if (Date.now() > rec.expiresAt) {
        this.mem.delete(key);
        return null;
      }
      return rec.value as T;
    }
  }
}
