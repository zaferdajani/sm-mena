import { describe, expect, it } from "vitest";
import { storageHealth } from "@/lib/storage/health";

describe("storage health (/api/health)", () => {
  it("passes local disk off Vercel (development, CI) and Supabase with its keys", () => {
    expect(storageHealth({})).toEqual({ ready: true, label: "local" });
    expect(storageHealth({ STORAGE_PROVIDER: "supabase", SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k", VERCEL: "1" })).toEqual({ ready: true, label: "supabase" });
  });
  it("fails Supabase without its keys", () => {
    expect(storageHealth({ STORAGE_PROVIDER: "supabase", SUPABASE_URL: "https://x.supabase.co" }).ready).toBe(false);
  });
  it("fails local disk on Vercel, where uploads vanish between requests", () => {
    expect(storageHealth({ VERCEL: "1", STORAGE_PROVIDER: "local" })).toEqual({ ready: false, label: "local (temporary on Vercel: uploads vanish)" });
  });
});

describe("GET /api/health", () => {
  it("tells the public only whether the site is up, and the team the configuration", async () => {
    const { GET } = await import("@/app/api/health/route");
    const prev = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "health-test-secret";
    try {
      const open = await (await GET(new Request("http://x/api/health"))).json();
      expect(open).toEqual({ ok: true });
      const wrong = await (await GET(new Request("http://x/api/health", { headers: { authorization: "Bearer nope" } }))).json();
      expect(Object.keys(wrong)).toEqual(["ok"]);
      const team = await (await GET(new Request("http://x/api/health", { headers: { authorization: "Bearer health-test-secret" } }))).json();
      expect(team).toMatchObject({ ok: true, database: "pglite", storage: "local" });
      expect(team).toHaveProperty("ai");
    } finally {
      if (prev === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = prev;
    }
  });
});
