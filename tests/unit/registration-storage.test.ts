import { afterEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({ publicPrivateBucket: false, missing: false, upload: vi.fn(), from: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ storage: {
    getBucket: async (name: string) => fake.missing ? { data: null, error: new Error("unreachable") } : { data: { public: name.endsWith("-private") ? fake.publicPrivateBucket : true }, error: null },
    createBucket: async () => ({ error: new Error("already exists") }),
    from: (name: string) => { fake.from(name); return { upload: async (...args: unknown[]) => { fake.upload(...args); return { error: null }; } }; },
  } }),
}));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); vi.resetModules(); fake.publicPrivateBucket = false; fake.missing = false; });
async function adapter() {
  vi.stubEnv("STORAGE_PROVIDER", "supabase"); vi.stubEnv("SUPABASE_URL", "https://storage.test.invalid");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only"); vi.stubEnv("SUPABASE_BUCKET", "media");
  return (await import("@/lib/storage")).storage();
}
describe("registration portfolio private storage", () => {
  it("writes only to a verified private bucket and returns an access-checked route", async () => {
    const storage = await adapter();
    const key = "portfolio/12345678-1234-1234-1234-123456789abc/posts/abc.webp";
    await storage.put(key, Buffer.from("sample"), "image/webp");
    expect(fake.from).toHaveBeenCalledWith("media-private");
    expect(fake.upload).toHaveBeenCalledWith(key, expect.any(Buffer), expect.objectContaining({ cacheControl: "0" }));
    expect(storage.url(key)).toBe(`/api/portfolio-media/${key}`);
  });
  it("refuses a misconfigured public bucket instead of exposing the file", async () => {
    fake.publicPrivateBucket = true;
    await expect((await adapter()).put("portfolio/a/posts/b.webp", Buffer.from("sample"), "image/webp")).rejects.toThrow("operation refused");
    expect(fake.upload).not.toHaveBeenCalled();
  });
  it("fails closed when bucket privacy cannot be read", async () => {
    fake.missing = true;
    await expect((await adapter()).put("portfolio/a/posts/b.webp", Buffer.from("sample"), "image/webp")).rejects.toThrow("operation refused");
    expect(fake.upload).not.toHaveBeenCalled();
  });
});
