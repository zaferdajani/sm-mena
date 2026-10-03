import { limitedWith, limitWith, MemoryStore, type RateLimitResult, type RateLimitStore } from "@/lib/core/rules/rate-limit";

// Platform binding of lib/core/rules/rate-limit.ts: one process-wide store (in memory by default;
// swap for a shared store when running several instances) and the RATE_LIMIT_MULTIPLIER knob.

let store: RateLimitStore = new MemoryStore();

/** Replaces the store (a shared one in multi-instance deployments; a fake in tests). */
export function useRateLimitStore(next: RateLimitStore) {
  store = next;
}

// RATE_LIMIT_MULTIPLIER raises every limit (the browser test suite signs up and
// signs in far more often from one address than any person would).
const multiplier = () => Math.max(1, Number(process.env.RATE_LIMIT_MULTIPLIER) || 1);

/** Counts an attempt; true while the key is within `limit` per window. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  return limitWith(store, key, limit * multiplier(), windowMs).ok;
}

/** Like rateLimit, with the seconds to wait for a 429's Retry-After. */
export function rateLimitDetail(key: string, limit: number, windowMs: number): RateLimitResult {
  return limitWith(store, key, limit * multiplier(), windowMs);
}

/** True when the key is already over its limit, without counting a new attempt. */
export function isRateLimited(key: string, limit: number): boolean {
  return limitedWith(store, key, limit * multiplier());
}

export function resetRateLimits() {
  store.clear();
}
