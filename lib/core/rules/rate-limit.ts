// Fixed-window rate limiting over a pluggable store (docs/architecture/mobile-and-api-roadmap.md §3
// step 9). MemoryStore is right for one server; a shared store (Postgres, Upstash) implements the
// same three methods when several instances run. Pure: the clock and the multiplier come in.

export type Bucket = { count: number; resetAt: number };

export interface RateLimitStore {
  /** Counts one attempt in the key's current window and returns the window after counting. */
  hit(key: string, windowMs: number, now: number): Bucket;
  /** The key's current window without counting, or null when none is open. */
  peek(key: string, now: number): Bucket | null;
  clear(): void;
}

export class MemoryStore implements RateLimitStore {
  private buckets = new Map<string, Bucket>();
  hit(key: string, windowMs: number, now: number): Bucket {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      if (this.buckets.size > 10_000) {
        for (const [k, b] of this.buckets) if (b.resetAt <= now) this.buckets.delete(k);
      }
      return fresh;
    }
    bucket.count += 1;
    return bucket;
  }
  peek(key: string, now: number): Bucket | null {
    const bucket = this.buckets.get(key);
    return bucket && bucket.resetAt > now ? bucket : null;
  }
  clear() {
    this.buckets.clear();
  }
}

export type RateLimitResult = { ok: boolean; remaining: number; /** Seconds until the window resets. */ retryAfter: number };

export function limitWith(store: RateLimitStore, key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const bucket = store.hit(key, windowMs, now);
  return { ok: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), retryAfter: Math.max(0, Math.ceil((bucket.resetAt - now) / 1000)) };
}

export function limitedWith(store: RateLimitStore, key: string, limit: number, now = Date.now()): boolean {
  const bucket = store.peek(key, now);
  return Boolean(bucket && bucket.count >= limit);
}
