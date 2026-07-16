import type {
  SharedContext,
  ContextCacheEntry,
  ContextSliceName,
  IContextCache,
} from '@luna-ai/types';

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
}

/**
 * SharedContextCache — TTL-based, token-aware cache for SharedContext snapshots.
 *
 * Design decisions:
 *  - Keys are caller-defined strings (typically a hash of build options +
 *    slice names).
 *  - Each entry records which slices it contains so slice-level invalidation
 *    can sweep only relevant entries.
 *  - A soft token cap (`maxTotalTokens`) triggers LRU eviction when exceeded.
 *  - Expired entries are lazily evicted on every read/write.
 */
export class SharedContextCache implements IContextCache {
  private readonly entries: Map<string, ContextCacheEntry>;
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;
  private readonly maxTotalTokens: number;
  private readonly stats: CacheStats;

  constructor(
    defaultTtlMs = 10_000,   // 10 seconds
    maxEntries = 100,
    maxTotalTokens = 500_000,
  ) {
    this.entries = new Map();
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
    this.maxTotalTokens = maxTotalTokens;
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  // ---------------------------------------------------------------------------
  // IContextCache implementation
  // ---------------------------------------------------------------------------

  get(key: string): SharedContext | null {
    this.evictExpired();

    const entry = this.entries.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt.getTime()) {
      this.entries.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    entry.hitCount++;
    this.stats.hits++;
    return entry.context;
  }

  set(
    key: string,
    context: SharedContext,
    ttlMs: number = this.defaultTtlMs,
  ): void {
    this.evictExpired();
    this.enforceCapacity();

    const now = new Date();
    const entry: ContextCacheEntry = {
      key,
      context,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
      tokenCount: context.tokenBudget.usedTokens,
      slices: this.presentSlices(context),
      hitCount: 0,
    };

    this.entries.set(key, entry);
    this.enforceTokenCap();
  }

  invalidate(key: string): void {
    this.entries.delete(key);
  }

  /**
   * Remove all cached entries that contain the given slice.
   * Use this when a slice's source data changes (e.g. active file changed →
   * invalidate 'editor' and 'workspace' slices).
   */
  invalidateSlice(sliceName: ContextSliceName): void {
    for (const [key, entry] of this.entries) {
      if (entry.slices.includes(sliceName)) {
        this.entries.delete(key);
        this.stats.evictions++;
      }
    }
  }

  clear(): void {
    const count = this.entries.size;
    this.entries.clear();
    this.stats.evictions += count;
  }

  size(): number {
    return this.entries.size;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  // ---------------------------------------------------------------------------
  // Additional helpers (not on IContextCache but useful to callers)
  // ---------------------------------------------------------------------------

  /** Total tokens currently held across all cached entries. */
  totalTokens(): number {
    return Array.from(this.entries.values()).reduce(
      (sum, e) => sum + e.tokenCount,
      0,
    );
  }

  /** Returns all currently-valid entries (does not mutate). */
  listEntries(): ContextCacheEntry[] {
    this.evictExpired();
    return Array.from(this.entries.values());
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now > entry.expiresAt.getTime()) {
        this.entries.delete(key);
        this.stats.evictions++;
      }
    }
  }

  /**
   * If we are at or above maxEntries, evict the least-recently-hit entry
   * (lowest hitCount, oldest createdAt as tiebreaker).
   */
  private enforceCapacity(): void {
    while (this.entries.size >= this.maxEntries) {
      const lru = this.findLRU();
      if (!lru) break;
      this.entries.delete(lru);
      this.stats.evictions++;
    }
  }

  /**
   * If total tokens exceed the cap, evict the entry with the largest token
   * count until we are back under the cap.
   */
  private enforceTokenCap(): void {
    while (this.totalTokens() > this.maxTotalTokens && this.entries.size > 0) {
      const heaviest = this.findHeaviest();
      if (!heaviest) break;
      this.entries.delete(heaviest);
      this.stats.evictions++;
    }
  }

  private findLRU(): string | null {
    let lruKey: string | null = null;
    let lruHits = Infinity;
    let lruTime = Infinity;

    for (const [key, entry] of this.entries) {
      if (
        entry.hitCount < lruHits ||
        (entry.hitCount === lruHits && entry.createdAt.getTime() < lruTime)
      ) {
        lruKey = key;
        lruHits = entry.hitCount;
        lruTime = entry.createdAt.getTime();
      }
    }

    return lruKey;
  }

  private findHeaviest(): string | null {
    let heavyKey: string | null = null;
    let heavyTokens = -1;

    for (const [key, entry] of this.entries) {
      if (entry.tokenCount > heavyTokens) {
        heavyKey = key;
        heavyTokens = entry.tokenCount;
      }
    }

    return heavyKey;
  }

  private presentSlices(context: SharedContext): ContextSliceName[] {
    const names: ContextSliceName[] = [
      'workspace', 'editor', 'chat', 'memory', 'rag', 'tool', 'applicationState',
    ];
    return names.filter(n => context[n] !== undefined && context[n] !== null);
  }
}
