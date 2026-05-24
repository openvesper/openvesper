// ============================================================
// 🌒 @openvesper/core — Cache Layer
// In-memory LRU cache for tool results with TTL
// ============================================================

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
}

/**
 * LRU cache with TTL support.
 * Used to cache tool results (e.g. API calls) to reduce redundant requests.
 */
export class LRUCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private defaultTTL: number;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(opts: { maxSize?: number; defaultTTL?: number } = {}) {
    this.maxSize = opts.maxSize || 500;
    this.defaultTTL = opts.defaultTTL || 60_000; // 60 seconds default
  }

  /**
   * Get a value. Returns undefined if expired or missing.
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Refresh position (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    entry.hits++;
    this.hits++;
    return entry.value;
  }

  /**
   * Set a value with optional TTL override (ms).
   */
  set(key: string, value: T, ttlMs?: number): void {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.evictions++;
      }
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTL),
      hits: 0,
    });
  }

  /**
   * Delete a specific key.
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Get cache statistics.
   */
  stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
      evictions: this.evictions,
    };
  }

  /**
   * Wrap an async function with caching.
   * Same args → cached result.
   */
  wrap<Args extends unknown[], R>(
    fn: (...args: Args) => Promise<R>,
    keyFn: (...args: Args) => string,
    ttlMs?: number
  ): (...args: Args) => Promise<R> {
    return async (...args: Args): Promise<R> => {
      const key = keyFn(...args);
      const cached = this.get(key) as R | undefined;
      if (cached !== undefined) return cached;
      const result = await fn(...args);
      this.set(key, result as unknown as T, ttlMs);
      return result;
    };
  }
}

/**
 * Domain-specific cache TTLs (in ms).
 */
export const CACHE_TTL = {
  // Real-time data (short TTL)
  PRICE_REALTIME: 10_000,     // 10s
  ORDERBOOK: 5_000,           // 5s
  LIQUIDATIONS: 30_000,       // 30s

  // Medium-frequency data
  TRENDING: 60_000,           // 1min
  TOP_HOLDERS: 5 * 60_000,    // 5min
  WALLET_BALANCE: 60_000,     // 1min

  // Slow-changing data
  TOKEN_METADATA: 30 * 60_000, // 30min
  PROTOCOL_TVL: 5 * 60_000,    // 5min
  HISTORICAL_OHLC: 60 * 60_000, // 1h
  NFT_FLOOR: 5 * 60_000,        // 5min

  // Static-ish data
  TOKEN_INFO: 60 * 60_000,    // 1h
  PROTOCOL_INFO: 24 * 60 * 60_000, // 24h
} as const;

/**
 * Global tool result cache (singleton).
 */
export const toolCache = new LRUCache<unknown>({ maxSize: 1000, defaultTTL: CACHE_TTL.TRENDING });

/**
 * Compose a cache key from tool name + input.
 */
export function toolCacheKey(toolName: string, input: Record<string, unknown>): string {
  const sortedKeys = Object.keys(input).sort();
  const inputStr = sortedKeys.map((k) => `${k}=${JSON.stringify(input[k])}`).join("&");
  return `${toolName}::${inputStr}`;
}

/**
 * Request batching - groups identical requests together.
 */
export class RequestBatcher<TArgs, TResult> {
  private pending: Map<string, Promise<TResult>> = new Map();

  /**
   * If a request with this key is already in-flight, await it instead of starting a new one.
   */
  async dedupe(key: string, fn: () => Promise<TResult>): Promise<TResult> {
    const existing = this.pending.get(key);
    if (existing) return existing;

    const promise = fn().finally(() => {
      this.pending.delete(key);
    });
    this.pending.set(key, promise);
    return promise;
  }

  size(): number {
    return this.pending.size;
  }
}

export const globalBatcher = new RequestBatcher<unknown, unknown>();
