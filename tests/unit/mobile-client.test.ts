import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { API_ERROR_CODES } from "@/lib/api/errors";
import { missingForPublish as serverMissing } from "@/lib/data/portfolio-setup";
import { API_ERROR_CODES as APP_CODES, MAX_IMAGES_PER_POST as APP_MAX, missingForPublish as appMissing } from "@/mobile/src/api/contract";
import { ApiFailure, createClient, memoryStore, REFRESH_WITHIN_DAYS } from "@/mobile/src/api/client";
import { MAX_IMAGES_PER_POST } from "@/lib/core/catalog/media-limits";

// The Expo app's framework-free API layer (mobile/src/api), checked against the server's contract and
// against a fake server: headers, token lifecycle, the two global answers and the publish rule.

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };
function fakeServer(script: (call: Call, n: number) => { status: number; json?: unknown; headers?: Record<string, string> }) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const headers = Object.fromEntries(Object.entries((init?.headers as Record<string, string>) ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
    const call: Call = { url: String(input), method: init?.method ?? "GET", headers, body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body };
    calls.push(call);
    const r = script(call, calls.length);
    const h = new Headers({ ...(r.json !== undefined ? { "content-type": "application/json" } : {}), ...(r.headers ?? {}) });
    return new Response(r.json !== undefined ? JSON.stringify(r.json) : null, { status: r.status, headers: h });
  }) as typeof fetch;
  return { calls, fetch: fetchImpl };
}
const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

describe("contract parity with the server", () => {
  it("knows exactly the server's error codes and media limit", () => {
    expect([...APP_CODES]).toEqual([...API_ERROR_CODES]);
    expect(APP_MAX).toBe(MAX_IMAGES_PER_POST);
  });
  it("judges a draft ready to publish exactly as the server does", () => {
    const media = [{ id: "m", url: "/api/v1/media/m", width: 10, height: 10 }];
    const cases = [
      { data: {}, media },
      { data: { project: { title: "A", contribution: "long enough", services: ["photography"] } }, media },
      { data: { project: { title: "Spring", contribution: "Shoot", services: [] } }, media },
      { data: { project: { title: "Spring", contribution: "Shoot", services: ["photography"] } }, media: [] },
      { data: { project: { title: "Spring", contribution: "Shoot", services: ["photography"] } }, media },
    ];
    for (const c of cases) {
      const view = { status: "in_progress" as const, step: 5, version: 1, postId: null, ...c };
      expect(appMissing(view)).toBe(serverMissing(view));
    }
  });
  it("ships the same service catalog as the web", () => {
    const web = JSON.parse(readFileSync("data/service-taxonomy.json", "utf8"));
    const app = JSON.parse(readFileSync("mobile/src/catalog/services.json", "utf8"));
    const project = (c: { key: string; name_ar: string; name_en: string; services: { key: string; name_ar: string; name_en: string }[] }) => ({ key: c.key, name_ar: c.name_ar, name_en: c.name_en, services: c.services.map((s) => ({ key: s.key, name_ar: s.name_ar, name_en: s.name_en })) });
    expect(app).toEqual({ version: web.version, categories: web.categories.map(project) });
  });
});

describe("client behaviour", () => {
  const app = { version: "0.1.0", platform: "ios" };
  it("signs in, stores the token and sends it with the app header on every call", async () => {
    const store = memoryStore();
    const server = fakeServer((call, n) => (n === 1 ? { status: 201, json: { token: "tok-1", expiresAt: inDays(30), user: { id: "u", role: "agency", mfaEnabled: false } } } : { status: 200, json: { user: { id: "u", role: "agency", mfaEnabled: false }, agency: null, setup: null } }));
    const client = createClient({ baseUrl: "https://staging.test/", store, app, fetch: server.fetch });
    await client.auth.login("a@b.jo", "secret-123");
    expect(server.calls[0]).toMatchObject({ url: "https://staging.test/api/v1/auth/login", method: "POST", body: { email: "a@b.jo", password: "secret-123" } });
    expect(server.calls[0].headers.authorization).toBeUndefined();
    expect(server.calls[0].headers["x-sawwiq-app"]).toBe("expo/0.1.0 (ios)");
    expect((await store.get())?.token).toBe("tok-1");
    await client.setup.me();
    expect(server.calls[1].headers.authorization).toBe("Bearer tok-1");
  });
  it("turns the error contract into ApiFailure and keeps the server's code and reason", async () => {
    const server = fakeServer(() => ({ status: 409, json: { error: { code: "stale", reason: "stale" } } }));
    const client = createClient({ baseUrl: "https://s.test", store: memoryStore({ token: "t", expiresAt: inDays(20) }), app, fetch: server.fetch });
    const failure = await client.setup.publish(3, true).catch((e) => e);
    expect(failure).toBeInstanceOf(ApiFailure);
    expect(failure).toMatchObject({ code: "stale", status: 409, reason: "stale" });
  });
  it("clears the device session on unauthenticated and tells the app", async () => {
    const store = memoryStore({ token: "dead", expiresAt: inDays(20) });
    let out = 0;
    const server = fakeServer(() => ({ status: 401, json: { error: { code: "unauthenticated" } } }));
    const client = createClient({ baseUrl: "https://s.test", store, app, fetch: server.fetch, onUnauthenticated: () => out++ });
    await expect(client.setup.me()).rejects.toMatchObject({ code: "unauthenticated" });
    expect(await store.get()).toBeNull();
    expect(out).toBe(1);
  });
  it("stops on upgrade_required and reports the minimum version", async () => {
    let minimum: string | null | undefined;
    const server = fakeServer(() => ({ status: 426, json: { error: { code: "upgrade_required", reason: "minVersion" } }, headers: { "x-min-app-version": "2.0.0" } }));
    const client = createClient({ baseUrl: "https://s.test", store: memoryStore({ token: "t", expiresAt: inDays(20) }), app, fetch: server.fetch, onUpgradeRequired: (m) => (minimum = m) });
    await expect(client.setup.me()).rejects.toMatchObject({ code: "upgrade_required" });
    expect(minimum).toBe("2.0.0");
  });
  it("rotates the token only when the window is closing, once for concurrent callers", async () => {
    const store = memoryStore({ token: "old", expiresAt: inDays(REFRESH_WITHIN_DAYS - 1) });
    const server = fakeServer(() => ({ status: 201, json: { token: "new", expiresAt: inDays(30) } }));
    const client = createClient({ baseUrl: "https://s.test", store, app, fetch: server.fetch });
    await Promise.all([client.auth.refreshIfNeeded(), client.auth.refreshIfNeeded()]);
    expect(server.calls).toHaveLength(1);
    expect(server.calls[0].headers.authorization).toBe("Bearer old");
    expect((await store.get())?.token).toBe("new");
    await client.auth.refreshIfNeeded();
    expect(server.calls).toHaveLength(1);
  });
  it("logout and logout-all always clear the device, even when the server is unreachable", async () => {
    const store = memoryStore({ token: "t", expiresAt: inDays(20) });
    const client = createClient({ baseUrl: "https://s.test", store, app, fetch: (async () => { throw new TypeError("offline"); }) as typeof fetch });
    await expect(client.auth.logoutAll()).rejects.toBeInstanceOf(TypeError);
    expect(await store.get()).toBeNull();
  });
  it("sends images as multipart under the server's field name", async () => {
    const server = fakeServer(() => ({ status: 201, json: { setup: { status: "in_progress", step: 3, version: 2, data: {}, postId: null, media: [] } } }));
    const client = createClient({ baseUrl: "https://s.test", store: memoryStore({ token: "t", expiresAt: inDays(20) }), app, fetch: server.fetch });
    await client.setup.upload([new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" })]);
    const body = server.calls[0].body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.getAll("images")).toHaveLength(1);
    expect(server.calls[0].headers["content-type"]).toBeUndefined();
  });
});
