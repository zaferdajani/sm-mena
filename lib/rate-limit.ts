// Fixed-window, in-memory rate limiter. Adequate for a single server
// instance; swap for a shared store (e.g. Upstash) when running several.
const buckets = new Map<string, { count: number; resetAt: number }>();

// RATE_LIMIT_MULTIPLIER raises every limit (the browser test suite signs up and
// signs in far more often from one address than any person would).
const multiplier = () => Math.max(1, Number(process.env.RATE_LIMIT_MULTIPLIER) || 1);

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  limit *= multiplier();
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

/** True when the key is already over its limit, without counting a new attempt. */
export function isRateLimited(key: string, limit: number): boolean {
  const bucket = buckets.get(key);
  return Boolean(bucket && bucket.resetAt > Date.now() && bucket.count >= limit * multiplier());
}

export function resetRateLimits() {
  buckets.clear();
}
