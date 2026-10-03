import "./setup-db";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgency } from "@/lib/data/agencies";
import { setPublication } from "@/lib/data/publication";
import { createUser } from "@/lib/data/users";
import { closeDb } from "@/lib/db";
import { resetRateLimits } from "@/lib/rate-limit";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { POST as logoutAll } from "@/app/api/v1/auth/logout-all/route";
import { POST as refresh } from "@/app/api/v1/auth/refresh/route";
import { GET as me } from "@/app/api/v1/me/route";
import { PATCH as patchProfile } from "@/app/api/v1/profile/route";
import { POST as avatar } from "@/app/api/v1/profile/avatar/route";
import { POST as open } from "@/app/api/v1/portfolio/open/route";
import { PATCH as patchPortfolio } from "@/app/api/v1/portfolio/route";
import { POST as publish } from "@/app/api/v1/portfolio/publish/route";
import { POST as restart } from "@/app/api/v1/portfolio/restart/route";
import { GET as listMedia, POST as uploadMedia } from "@/app/api/v1/media/route";
import { PUT as orderMedia } from "@/app/api/v1/media/order/route";
import { DELETE as deleteMedia, GET as readMedia } from "@/app/api/v1/media/[id]/route";
import { GET as project } from "@/app/api/v1/projects/[id]/route";
import { GET as portfolioMedia } from "@/app/api/portfolio-media/[...key]/route";

// Contract tests of the bearer API, slice A (roadmap §8): the handlers are called as Next would call them,
// against an in-memory database. The switch is on for the file; one test turns it off.

const BASE = "http://sawwiq.test";
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const call = async (handler: (r: Request, ctx?: any) => Promise<Response>, path: string, init: RequestInit & { token?: string | null; json?: unknown; params?: Record<string, unknown> } = {}) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const headers = new Headers(init.headers);
  if (init.token) headers.set("authorization", `Bearer ${init.token}`);
  if (init.json !== undefined) headers.set("content-type", "application/json");
  const res = await handler(new Request(`${BASE}${path}`, { ...init, headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body }), { params: Promise.resolve(init.params ?? {}) });
  const type = res.headers.get("content-type") ?? "";
  return { status: res.status, headers: res.headers, body: (type.includes("json") ? await res.json() : await res.arrayBuffer()) as Json & ArrayBuffer };
};

let png: Buffer;
let other: { email: string; password: string; token?: string };
const owner = { email: "api-owner@t.jo", password: "password-1234", token: "" };

beforeAll(async () => {
  process.env.API_V1_ENABLED = "true";
  png = await sharp({ create: { width: 900, height: 700, channels: 3, background: { r: 30, g: 110, b: 80 } } }).png().toBuffer();
  const u = await createUser(owner.email, owner.password);
  const a = await createAgency(u.id, { handle: "api.owner", name: "API Owner", city: "amman", services: ["photography"], whatsapp: "+962790000009" });
  // The unit database runs in the full phase; a registration-phase account is private from birth. Make this one private the same way.
  await setPublication(u.id, a.id, "private");
  other = { email: "api-other@t.jo", password: "password-1234" };
  const o = await createUser(other.email, other.password);
  await createAgency(o.id, { handle: "api.other", name: "Other Studio", city: "amman", services: ["photography"] });
  const s = await createUser("api-staff@t.jo", "password-1234", "support");
  void s;
  resetRateLimits();
});
afterAll(async () => {
  delete process.env.API_V1_ENABLED;
  await closeDb();
});

describe("switch and identity", () => {
  it("is an unknown path while API_V1_ENABLED is not 'true'", async () => {
    process.env.API_V1_ENABLED = "false";
    try {
      const res = await call(me, "/api/v1/me");
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).not.toContain("json");
    } finally {
      process.env.API_V1_ENABLED = "true";
    }
  });
  it("tells an app older than API_MIN_APP_VERSION to update, and nobody else", async () => {
    process.env.API_MIN_APP_VERSION = "2.1.0";
    try {
      const old = await call(me, "/api/v1/me", { headers: { "x-sawwiq-app": "expo/2.0.9 (ios)" } });
      expect(old.status).toBe(426);
      expect(old.body.error).toMatchObject({ code: "upgrade_required", reason: "minVersion" });
      expect(old.headers.get("x-min-app-version")).toBe("2.1.0");
      // A current app, a malformed header and no header at all are each judged on their own merits (here: no token → 401).
      expect((await call(me, "/api/v1/me", { headers: { "x-sawwiq-app": "expo/2.1.0 (android)" } })).status).toBe(401);
      expect((await call(me, "/api/v1/me", { headers: { "x-sawwiq-app": "not-a-version" } })).status).toBe(401);
      expect((await call(me, "/api/v1/me")).status).toBe(401);
    } finally {
      delete process.env.API_MIN_APP_VERSION;
    }
  });
  it("signs a provider in with the web's rules and never through a cookie", async () => {
    const bad = await call(login, "/api/v1/auth/login", { method: "POST", json: { email: owner.email, password: "wrong" } });
    expect(bad.status).toBe(401);
    expect(bad.body.error).toEqual({ code: "unauthenticated", reason: "invalidCredentials" });
    const malformed = await call(login, "/api/v1/auth/login", { method: "POST", json: { email: "nope" } });
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe("invalid");
    expect(malformed.body.error.fields.map((f: Json) => f.path).sort()).toEqual(["email", "password"]);
    const staff = await call(login, "/api/v1/auth/login", { method: "POST", json: { email: "api-staff@t.jo", password: "password-1234" } });
    expect(staff.status).toBe(403);
    expect(staff.body.error.reason).toBe("staff");

    const ok = await call(login, "/api/v1/auth/login", { method: "POST", json: { email: owner.email, password: owner.password } });
    expect(ok.status).toBe(201);
    expect(ok.body.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(ok.body.user).toEqual(expect.objectContaining({ role: "agency", mfaEnabled: false }));
    owner.token = ok.body.token;

    const noAuth = await call(me, "/api/v1/me", { headers: { cookie: `sw_session=${owner.token}` } });
    expect(noAuth.status).toBe(401);
    expect(noAuth.body.error.code).toBe("unauthenticated");
    expect(noAuth.headers.get("cache-control")).toBe("private, no-store");
  });
  it("locks an address+account after eight failed passwords", async () => {
    for (let i = 0; i < 8; i++) await call(login, "/api/v1/auth/login", { method: "POST", json: { email: other.email, password: "wrong" }, headers: { "x-forwarded-for": "203.0.113.77" } });
    const locked = await call(login, "/api/v1/auth/login", { method: "POST", json: { email: other.email, password: other.password }, headers: { "x-forwarded-for": "203.0.113.77" } });
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe("rate_limited");
    expect(Number(locked.headers.get("retry-after"))).toBeGreaterThan(0);
    const elsewhere = await call(login, "/api/v1/auth/login", { method: "POST", json: { email: other.email, password: other.password }, headers: { "x-forwarded-for": "203.0.113.78" } });
    expect(elsewhere.status).toBe(201);
    other.token = elsewhere.body.token;
  });
});

describe("slice A: sign-in → upload → reload → publish → owner-only read", () => {
  let version = 0;
  let mediaIds: string[] = [];
  let postId = "";
  let imageKey = "";

  it("GET /me returns the account, the agency's own fields and no draft yet", async () => {
    const res = await call(me, "/api/v1/me", { token: owner.token });
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: expect.any(String), email: owner.email, role: "agency", mfaEnabled: false });
    expect(res.body.agency).toEqual(expect.objectContaining({ handle: "api.owner", visibility: "private", whatsapp: "+962790000009", services: ["photography"] }));
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|totp/);
    expect(res.body.setup).toBeNull();
  });
  it("opens the draft and saves the profile step", async () => {
    const opened = await call(open, "/api/v1/portfolio/open", { method: "POST", token: owner.token });
    expect(opened.status).toBe(201);
    expect(opened.body.setup).toMatchObject({ status: "in_progress", step: 1, media: [] });
    version = opened.body.setup.version;

    const invalid = await call(patchProfile, "/api/v1/profile", { method: "PATCH", token: owner.token, json: { version, name: "A" } });
    expect(invalid.status).toBe(400);
    const saved = await call(patchProfile, "/api/v1/profile", { method: "PATCH", token: owner.token, json: { version, name: "API Owner Studio", bio: "We shoot products.", services: ["photography", "smm_content"] } });
    expect(saved.status).toBe(200);
    expect(saved.body.changed).toEqual(expect.arrayContaining(["name", "bio", "services"]));
    const stale = await call(patchProfile, "/api/v1/profile", { method: "PATCH", token: owner.token, json: { version: version + 99, bio: "later" } });
    expect(stale.status).toBe(409);
    expect(stale.body.error).toEqual({ code: "stale", reason: "stale" });
    version = saved.body.setup.version;

    const form = new FormData();
    form.set("version", String(version));
    form.set("avatar", new File([new Uint8Array(png)], "me.png", { type: "image/png" }));
    const pic = await call(avatar, "/api/v1/profile/avatar", { method: "POST", token: owner.token, body: form });
    expect(pic.status).toBe(200);
    expect(pic.body.changed).toContain("avatar");
    version = pic.body.setup.version;
  });
  it("chooses the upload source and stages images (all or none, owner only)", async () => {
    const src = await call(patchPortfolio, "/api/v1/portfolio", { method: "PATCH", token: owner.token, json: { kind: "source", version, source: "upload" } });
    expect(src.status).toBe(200);
    expect(src.body.setup).toMatchObject({ step: 3, data: { source: "upload" } });
    version = src.body.setup.version;
    const behance = await call(patchPortfolio, "/api/v1/portfolio", { method: "PATCH", token: owner.token, json: { kind: "source", version, source: "behance" } });
    expect(behance.status).toBe(400);

    const form = new FormData();
    form.append("images", new File([new Uint8Array(png)], "a.png", { type: "image/png" }));
    form.append("images", new File([new Uint8Array(png)], "b.png", { type: "image/png" }));
    const up = await call(uploadMedia, "/api/v1/media", { method: "POST", token: owner.token, body: form });
    expect(up.status).toBe(201);
    expect(up.body.setup.media).toHaveLength(2);
    expect(up.body.setup.media[0].url).toMatch(/^\/api\/v1\/media\/[0-9a-f-]{36}$/);
    mediaIds = up.body.setup.media.map((m: Json) => m.id);

    const bad = new FormData();
    bad.append("images", new File([new Uint8Array(png)], "ok.png", { type: "image/png" }));
    bad.append("images", new File([new TextEncoder().encode("not an image")], "x.png", { type: "image/png" }));
    const rejected = await call(uploadMedia, "/api/v1/media", { method: "POST", token: owner.token, body: bad });
    expect(rejected.status).toBe(400);
    expect((await call(listMedia, "/api/v1/media", { token: owner.token })).body.media).toHaveLength(2);

    const ordered = await call(orderMedia, "/api/v1/media/order", { method: "PUT", token: owner.token, json: { ids: [mediaIds[1], mediaIds[0]] } });
    expect(ordered.status).toBe(200);
    expect(ordered.body.setup.media.map((m: Json) => m.id)).toEqual([mediaIds[1], mediaIds[0]]);

    const image = await call(readMedia, `/api/v1/media/${mediaIds[0]}`, { token: owner.token, params: { id: mediaIds[0] } });
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/webp");
    expect(image.headers.get("cache-control")).toBe("private, no-store");
    const stranger = await call(readMedia, `/api/v1/media/${mediaIds[0]}`, { token: other.token, params: { id: mediaIds[0] } });
    expect(stranger.status).toBe(404);
    const anonymous = await call(readMedia, `/api/v1/media/${mediaIds[0]}`, { params: { id: mediaIds[0] } });
    expect(anonymous.status).toBe(401);

    const removed = await call(deleteMedia, `/api/v1/media/${mediaIds[1]}`, { method: "DELETE", token: owner.token, params: { id: mediaIds[1] } });
    expect(removed.status).toBe(200);
    expect(removed.body.setup.media.map((m: Json) => m.id)).toEqual([mediaIds[0]]);
  });
  it("reload is free: GET /me carries step, version, data and media; the client and project steps save", async () => {
    const reloaded = await call(me, "/api/v1/me", { token: owner.token });
    expect(reloaded.body.setup).toMatchObject({ step: 3, data: { source: "upload" } });
    expect(reloaded.body.setup.media).toHaveLength(1);
    version = reloaded.body.setup.version;

    const noClient = await call(patchPortfolio, "/api/v1/portfolio", { method: "PATCH", token: owner.token, json: { kind: "client", version, mode: "existing", clientId: "8d3f1b2e-6c7a-4f0e-9a1b-2c3d4e5f6a7b" } });
    expect(noClient.status).toBe(400);
    expect(noClient.body.error.reason).toBe("client");
    const client = await call(patchPortfolio, "/api/v1/portfolio", { method: "PATCH", token: owner.token, json: { kind: "client", version, mode: "personal" } });
    expect(client.status).toBe(200);
    expect(client.body.setup).toMatchObject({ step: 4, data: { client: { mode: "personal" } } });
    version = client.body.setup.version;

    const early = await call(publish, "/api/v1/portfolio/publish", { method: "POST", token: owner.token, json: { version, rights: true } });
    expect(early.status).toBe(400);
    expect(early.body.error.reason).toBe("noProject");

    const project = await call(patchPortfolio, "/api/v1/portfolio", { method: "PATCH", token: owner.token, json: { kind: "project", version, title: "Spring launch", contribution: "Concept, shoot and edit", services: ["photography", "made-up"] } });
    expect(project.status).toBe(200);
    expect(project.body.setup).toMatchObject({ step: 5, data: { project: { title: "Spring launch", services: ["photography"] } } });
    version = project.body.setup.version;
  });
  it("publishes once with the rights confirmation and the owner reads the project; others get 404", async () => {
    const noRights = await call(publish, "/api/v1/portfolio/publish", { method: "POST", token: owner.token, json: { version, rights: false } });
    expect(noRights.status).toBe(400);
    expect(noRights.body.error.reason).toBe("rights");
    const done = await call(publish, "/api/v1/portfolio/publish", { method: "POST", token: owner.token, json: { version, rights: true } });
    expect(done.status).toBe(201);
    expect(done.body.postId).toMatch(/^[0-9a-f-]{36}$/);
    expect(done.body.setup).toMatchObject({ status: "finished", postId: done.body.postId });
    postId = done.body.postId;

    const again = await call(publish, "/api/v1/portfolio/publish", { method: "POST", token: owner.token, json: { version, rights: true } });
    expect(again.status).toBe(201);
    expect(again.body.postId).toBe(postId);

    const mine = await call(project, `/api/v1/projects/${postId}`, { token: owner.token, params: { id: postId } });
    expect(mine.status).toBe(200);
    expect(mine.body.owner).toBe(true);
    expect(mine.body.project.images.length).toBe(1);
    imageKey = new URL(mine.body.project.images[0].url, BASE).pathname.replace(/^\/api\/portfolio-media\//, "");
    expect(imageKey).toMatch(/^portfolio\//);

    const theirs = await call(project, `/api/v1/projects/${postId}`, { token: other.token, params: { id: postId } });
    expect(theirs.status).toBe(404);
    const anonymous = await call(project, `/api/v1/projects/${postId}`, { params: { id: postId } });
    expect(anonymous.status).toBe(404);
  });
  it("private portfolio media opens to the owner's bearer token and to nobody else", async () => {
    const params = { key: imageKey.split("/") };
    const mine = await call(portfolioMedia, `/api/portfolio-media/${imageKey}`, { token: owner.token, params });
    expect(mine.status).toBe(200);
    expect(mine.headers.get("content-type")).toMatch(/^image\//);
    const theirs = await call(portfolioMedia, `/api/portfolio-media/${imageKey}`, { token: other.token, params });
    expect(theirs.status).toBe(404);
    // Without a bearer header the route keeps the web's cookie viewer (exercised by the browser suites); a dead token is an anonymous API reader.
    const dead = await call(portfolioMedia, `/api/portfolio-media/${imageKey}`, { token: "x".repeat(43), params });
    expect(dead.status).toBe(404);
  });
  it("restart opens a fresh draft; refresh rotates the token; logout and logout-all end sessions", async () => {
    const fresh = await call(restart, "/api/v1/portfolio/restart", { method: "POST", token: owner.token });
    expect(fresh.status).toBe(201);
    expect(fresh.body.setup).toMatchObject({ status: "in_progress", postId: null, media: [] });

    const rotated = await call(refresh, "/api/v1/auth/refresh", { method: "POST", token: owner.token });
    expect(rotated.status).toBe(201);
    expect((await call(me, "/api/v1/me", { token: owner.token })).status).toBe(401);
    owner.token = rotated.body.token;
    expect((await call(me, "/api/v1/me", { token: owner.token })).status).toBe(200);

    const second = await call(login, "/api/v1/auth/login", { method: "POST", json: { email: owner.email, password: owner.password } });
    expect((await call(logout, "/api/v1/auth/logout", { method: "POST", token: second.body.token })).status).toBe(200);
    expect((await call(me, "/api/v1/me", { token: second.body.token })).status).toBe(401);
    expect((await call(me, "/api/v1/me", { token: owner.token })).status).toBe(200);

    const third = await call(login, "/api/v1/auth/login", { method: "POST", json: { email: owner.email, password: owner.password } });
    expect((await call(logoutAll, "/api/v1/auth/logout-all", { method: "POST", token: owner.token })).status).toBe(200);
    expect((await call(me, "/api/v1/me", { token: owner.token })).status).toBe(401);
    expect((await call(me, "/api/v1/me", { token: third.body.token })).status).toBe(401);
    expect((await call(logoutAll, "/api/v1/auth/logout-all", { method: "POST" })).status).toBe(401);
  });
});
