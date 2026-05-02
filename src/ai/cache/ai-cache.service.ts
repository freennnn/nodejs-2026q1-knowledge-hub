import { Injectable, OnModuleDestroy } from '@nestjs/common';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

@Injectable()
export class AiCacheService implements OnModuleDestroy {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly pruneInterval: NodeJS.Timeout;

  constructor() {
    this.pruneInterval = setInterval(() => this.pruneExpired(), 86_400_000);
  }

  onModuleDestroy(): void {
    clearInterval(this.pruneInterval);
  }
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(
    key: string,
    value: T,
    ttlMs: number = Number(process.env.AI_CACHE_TTL_SEC ?? 300) * 1000,
  ): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }
}
