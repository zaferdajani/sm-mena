import { afterEach, describe, expect, it } from "vitest";
import { bearerTokenFrom, clientIpFrom, contextFrom, requestContext } from "@/lib/core/rules/request-context";
import { limitedWith, limitWith, MemoryStore } from "@/lib/core/rules/rate-limit";
import { isRateLimited, rateLimit, rateLimitDetail, resetRateLimits, useRateLimitStore } from "@/lib/rate-limit";

// Request context and rate limiting as interfaces (roadmap §3 steps 8 and 9).

describe("request context", () => {
  it("reads the caller's address from proxy headers, else 'local'", () => {
    expect(clientIpFrom(contextFrom({ "X-Forwarded-For": "203.0.113.9, 10.0.0.1" }))).toBe("203.0.113.9");
    expect(clientIpFrom(contextFrom({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIpFrom(contextFrom({}))).toBe("local");
  });
  it("takes a bearer token only from the Authorization header, never from a cookie", () => {
    const token = "a".repeat(43);
    expect(bearerTokenFrom(contextFrom({ authorization: `Bearer ${token}` }))).toBe(token);
    expect(bearerTokenFrom(contextFrom({ authorization: "Basic abc" }))).toBeNull();
    expect(bearerTokenFrom(contextFrom({ authorization: "Bearer short" }))).toBeNull();
    expect(bearerTokenFrom(contextFrom({}, { sw_session: token }))).toBeNull();
  });
  it("wraps a web Request, parsing its cookie header once", () => {
    const ctx = requestContext(new Request("http://x/", { headers: { cookie: "a=1; sw_country=jo; enc=%D8%B9", "x-forwarded-for": "1.2.3.4" } }));
    expect(ctx.cookie("sw_country")).toBe("jo");
    expect(ctx.cookie("enc")).toBe("ع");
    expect(ctx.cookie("missing")).toBeNull();
    expect(ctx.header("x-forwarded-for")).toBe("1.2.3.4");
  });
});

describe("rate-limit store", () => {
  afterEach(() => {
    useRateLimitStore(new MemoryStore());
    delete process.env.RATE_LIMIT_MULTIPLIER;
  });
  it("counts attempts per fixed window with an injected clock", () => {
    const store = new MemoryStore();
    const t0 = 1_000_000;
    expect(limitWith(store, "k", 2, 1000, t0)).toMatchObject({ ok: true, remaining: 1, retryAfter: 1 });
    expect(limitWith(store, "k", 2, 1000, t0 + 10)).toMatchObject({ ok: true, remaining: 0 });
    expect(limitWith(store, "k", 2, 1000, t0 + 20)).toMatchObject({ ok: false, remaining: 0 });
    expect(limitedWith(store, "k", 2, t0 + 30)).toBe(true);
    expect(limitWith(store, "k", 2, 1000, t0 + 1001).ok).toBe(true);
    expect(limitedWith(store, "k", 2, t0 + 1002)).toBe(false);
  });
  it("the platform binding applies the multiplier and accepts another store", () => {
    const calls: string[] = [];
    const store = new MemoryStore();
    useRateLimitStore({ hit: (k, w, n) => { calls.push(`hit:${k}`); return store.hit(k, w, n); }, peek: (k, n) => store.peek(k, n), clear: () => store.clear() });
    process.env.RATE_LIMIT_MULTIPLIER = "2";
    expect(rateLimit("x", 1, 60_000)).toBe(true);
    expect(rateLimit("x", 1, 60_000)).toBe(true);
    expect(rateLimit("x", 1, 60_000)).toBe(false);
    expect(isRateLimited("x", 1)).toBe(true);
    expect(rateLimitDetail("x", 1, 60_000).retryAfter).toBeGreaterThan(0);
    expect(calls).toHaveLength(4);
    resetRateLimits();
    expect(isRateLimited("x", 1)).toBe(false);
  });
});
