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
