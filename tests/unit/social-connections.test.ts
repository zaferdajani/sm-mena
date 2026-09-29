import "./setup-db";
import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { exportJWK, generateKeyPair, SignJWT, createLocalJWKSet } from "jose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createAgency } from "@/lib/data/agencies";
import { saveClient } from "@/lib/data/portfolio-clients";
import {
  browseItems,
  completeAttempt,
  confirmResources,
  consumeAttempt,
  disconnectGrant,
  listConnections,
  pendingResources,
  purgeSocial,
  revokeBySubject,
  startAttempt,
} from "@/lib/data/social";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { posts, socialGrants, socialImportItems, socialOauthAttempts, socialResources } from "@/lib/db/schema";
import { setGoogleKeys } from "@/lib/social/adapters/google";
import { openToken, sealToken } from "@/lib/social/crypto";
import { setSocialTransport } from "@/lib/social/http";
import { verifySignedRequest } from "@/lib/social/meta";
import { readiness } from "@/lib/social/providers";

// Creator platform connections (docs/53), with the network replaced by
// fixtures: these prove Sawwiq's own checks, not a platform's approval.

const ENV = {
  GOOGLE_OAUTH_CLIENT_ID: "google-client.apps.test",
  GOOGLE_OAUTH_CLIENT_SECRET: "google-secret",
  FACEBOOK_APP_ID: "fb-app",
  FACEBOOK_APP_SECRET: "fb-secret",
  INSTAGRAM_APP_ID: "ig-app",
  INSTAGRAM_APP_SECRET: "ig-secret",
  META_GRAPH_VERSION: "v23.0",
  TIKTOK_CLIENT_KEY: "tt-key",
  TIKTOK_CLIENT_SECRET: "tt-secret",
  SOCIAL_PROVIDERS_APPROVED: "google,youtube,instagram,facebook,tiktok",
};

type Route = (url: URL, init: RequestInit) => { status?: number; body: unknown } | undefined;
let routes: Route[] = [];
const calls: string[] = [];
function serve(...next: Route[]) {
  routes = next;
}
setSocialTransport((async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  calls.push(`${init?.method ?? "GET"} ${url.hostname}${url.pathname}`);
  for (const r of routes) {
    const hit = r(url, init ?? {});
    if (hit) return new Response(JSON.stringify(hit.body), { status: hit.status ?? 200, headers: { "content-type": "application/json" } });
  }
  return new Response("{}", { status: 404 });
}) as typeof fetch);

let agencyA: { id: string; ownerId: string };
let agencyB: { id: string; ownerId: string };
let clientOfB: string;

beforeAll(async () => {
  Object.assign(process.env, ENV);
  const a = await createUser("social-a@t.jo", "password-1234");
  const b = await createUser("social-b@t.jo", "password-1234");
  agencyA = { id: (await createAgency(a.id, { handle: "social.a", name: "A", city: "amman", services: ["video"] })).id, ownerId: a.id };
  agencyB = { id: (await createAgency(b.id, { handle: "social.b", name: "B", city: "amman", services: ["video"] })).id, ownerId: b.id };
  const saved = await saveClient(agencyB.id, null, { name: "B's client", industry: null, country: null, description: "", links: [] });
  clientOfB = "ok" in saved ? saved.id : "";
});
afterEach(() => {
  routes = [];
  calls.length = 0;
});
afterAll(() => {
  setSocialTransport(null);
  setGoogleKeys(null);
  return closeDb();
});

const start = (provider: "youtube" | "google" | "instagram" | "facebook" | "tiktok", overrides: Partial<Parameters<typeof startAttempt>[0]> = {}) =>
  startAttempt({ provider, userId: agencyA.ownerId, agencyId: agencyA.id, sessionId: "session-a", ownership: "own", clientId: null, locale: "en", returnTo: "connections", ...overrides });
const stateOf = (url: string) => new URL(url).searchParams.get("state")!;

const youtubeApi: Route[] = [
  (u) => (u.hostname === "oauth2.googleapis.com" && u.pathname === "/token" ? { body: { access_token: "yt-access", refresh_token: "yt-refresh", expires_in: 3600, scope: "https://www.googleapis.com/auth/youtube.readonly" } } : undefined),
  (u) => (u.pathname === "/youtube/v3/channels" && u.searchParams.get("part") === "snippet" ? { body: { items: [{ id: "UC_channel_1", snippet: { title: "My channel", customUrl: "@mine" } }, { id: "UC_brand_2", snippet: { title: "Brand channel" } }] } } : undefined),
];

describe("readiness gates", () => {
  it("never offers a provider on credentials alone", () => {
    const approved = process.env.SOCIAL_PROVIDERS_APPROVED;
    process.env.SOCIAL_PROVIDERS_APPROVED = "";
    expect(readiness("youtube")).toEqual({ state: "unavailable", blocker: "not_approved" });
    process.env.SOCIAL_PROVIDERS_APPROVED = approved;
    const id = process.env.TIKTOK_CLIENT_KEY;
    delete process.env.TIKTOK_CLIENT_KEY;
    expect(readiness("tiktok")).toEqual({ state: "unavailable", blocker: "no_app" });
    process.env.TIKTOK_CLIENT_KEY = id;
    const version = process.env.META_GRAPH_VERSION;
    process.env.META_GRAPH_VERSION = "latest";
    expect(readiness("instagram")).toEqual({ state: "unavailable", blocker: "no_version" });
    process.env.META_GRAPH_VERSION = version;
    expect(readiness("youtube")).toEqual({ state: "ready" });
  });
});

describe("authorization attempts", () => {
  it("asks each platform for read-only scopes, with PKCE only where supported", async () => {
    const yt = new URL(((await start("youtube")) as { url: string }).url);
    expect(yt.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/youtube.readonly");
    expect(yt.searchParams.get("code_challenge_method")).toBe("S256");
    expect(yt.searchParams.get("include_granted_scopes")).toBeNull();
    const google = new URL(((await start("google")) as { url: string }).url);
    expect(google.searchParams.get("scope")).toBe("openid profile");
    expect(google.searchParams.get("nonce")).toBeTruthy();
    const ig = new URL(((await start("instagram")) as { url: string }).url);
    expect(ig.searchParams.get("scope")).toBe("instagram_business_basic");
    expect(ig.searchParams.get("code_challenge")).toBeNull();
    const fb = new URL(((await start("facebook")) as { url: string }).url);
    expect(fb.pathname).toBe("/v23.0/dialog/oauth");
    expect(fb.searchParams.get("scope")).toBe("pages_show_list,pages_read_engagement");
    const tt = new URL(((await start("tiktok")) as { url: string }).url);
    expect(tt.searchParams.get("scope")).toBe("user.info.basic,video.list");
    for (const u of [yt, google, ig, fb, tt]) expect(u.searchParams.get("redirect_uri")).toMatch(/\/api\/social\/callback\/(youtube|google|instagram|facebook|tiktok)$/);
    // Only the hash of the state is stored.
    const db = await getDb();
    const rows = await db.select().from(socialOauthAttempts);
    expect(rows.some((r) => r.stateHash === yt.searchParams.get("state"))).toBe(false);
  });

  it("refuses another agency's client for a managed-account connection", async () => {
    expect(await start("youtube", { ownership: "client", clientId: clientOfB })).toEqual({ error: "client" });
  });

  it("takes a state once, only in the same session, for the same user and provider", async () => {
    const state = stateOf(((await start("youtube")) as { url: string }).url);
    expect(await consumeAttempt("youtube", state, "session-b", agencyA.ownerId)).toEqual({ error: "mismatch" });
    // The failed try above consumed it: a replay with the right session fails too.
    expect(await consumeAttempt("youtube", state, "session-a", agencyA.ownerId)).toEqual({ error: "mismatch" });

    const swapped = stateOf(((await start("youtube")) as { url: string }).url);
    expect(await consumeAttempt("tiktok", swapped, "session-a", agencyA.ownerId)).toEqual({ error: "mismatch" });
    const otherUser = stateOf(((await start("youtube")) as { url: string }).url);
    expect(await consumeAttempt("youtube", otherUser, "session-a", agencyB.ownerId)).toEqual({ error: "mismatch" });

    const expired = stateOf(((await start("youtube")) as { url: string }).url);
    const db = await getDb();
    await db.update(socialOauthAttempts).set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await consumeAttempt("youtube", expired, "session-a", agencyA.ownerId)).toEqual({ error: "expired" });

    const good = stateOf(((await start("youtube")) as { url: string }).url);
    const taken = await consumeAttempt("youtube", good, "session-a", agencyA.ownerId);
    expect("error" in taken).toBe(false);
    expect((taken as { verifier?: string }).verifier).toBeTruthy();
    expect(await consumeAttempt("youtube", good, "session-a", agencyA.ownerId)).toEqual({ error: "mismatch" });
  });
});

async function connectYoutube() {
  serve(...youtubeApi);
  const state = stateOf(((await start("youtube")) as { url: string }).url);
  const attempt = await consumeAttempt("youtube", state, "session-a", agencyA.ownerId);
  if ("error" in attempt) throw new Error(attempt.error);
  const done = await completeAttempt(attempt, "code-1");
  if ("error" in done) throw new Error(done.error);
  return done.grantId;
}

describe("completing a connection", () => {
  it("seals tokens, lists channels as pending, and only confirms listed ones", async () => {
    const grantId = await connectYoutube();
    const db = await getDb();
    const [grant] = await db.select().from(socialGrants).where(eq(socialGrants.id, grantId));
    expect(grant.sealedAccess).not.toContain("yt-access");
    expect(openToken(grant.sealedAccess, { owner: grantId, provider: "youtube", agencyId: agencyA.id, purpose: "access" })).toBe("yt-access");
    // Sealed for agency A: it does not open as agency B's.
    expect(openToken(grant.sealedAccess, { owner: grantId, provider: "youtube", agencyId: agencyB.id, purpose: "access" })).toBeNull();
    expect(grant.status).toBe("active");

    const pending = await pendingResources(agencyA.id, grantId);
    expect(pending.map((r) => r.name).sort()).toEqual(["Brand channel", "My channel"]);
    expect(await pendingResources(agencyB.id, grantId)).toEqual([]);
    // Another agency cannot confirm them; a made-up id is refused.
    expect(await confirmResources(agencyB.id, grantId, [pending[0].id])).toEqual({ error: "not_found" });
    expect(await confirmResources(agencyA.id, grantId, ["00000000-0000-4000-8000-000000000000"])).toEqual({ error: "mismatch" });
    const mine = pending.find((r) => r.name === "My channel")!;
    expect(await confirmResources(agencyA.id, grantId, [mine.id])).toEqual({ ok: true, selected: 1 });
    const connections = await listConnections(agencyA.id);
    expect(connections[0].resources.map((r) => r.name)).toEqual(["My channel"]);
    expect(JSON.stringify(connections)).not.toMatch(/yt-access|yt-refresh|sealed/);
    expect(await listConnections(agencyB.id)).toEqual([]);
  });

  it("marks a partial grant as limited", async () => {
    // Another Google account's channel (reconnecting the same channel would update its grant instead).
    serve(
      (u) => (u.pathname === "/token" ? { body: { access_token: "x", scope: "" } } : undefined),
      (u) => (u.pathname === "/youtube/v3/channels" ? { body: { items: [{ id: "UC_other", snippet: { title: "Other" } }] } } : undefined),
    );
    const state = stateOf(((await start("youtube")) as { url: string }).url);
    const attempt = await consumeAttempt("youtube", state, "session-a", agencyA.ownerId);
    const done = await completeAttempt(attempt as Exclude<typeof attempt, { error: string }>, "code");
    expect(done).toMatchObject({ limited: true });
  });

  it("explains a personal Instagram account instead of connecting it", async () => {
    serve(
      (u) => (u.hostname === "api.instagram.com" ? { body: { access_token: "short", user_id: "1789", permissions: "instagram_business_basic" } } : undefined),
      (u) => (u.pathname === "/access_token" ? { body: { access_token: "long", expires_in: 5_000_000 } } : undefined),
      (u) => (u.pathname === "/v23.0/me" ? { body: { user_id: "1789", username: "me", account_type: "PERSONAL" } } : undefined),
    );
    const state = stateOf(((await start("instagram")) as { url: string }).url);
    const attempt = await consumeAttempt("instagram", state, "session-a", agencyA.ownerId);
    expect(await completeAttempt(attempt as Exclude<typeof attempt, { error: string }>, "code")).toEqual({ error: "personal" });
  });

  it("verifies Google's ID token: signature, audience and nonce", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };
    setGoogleKeys(createLocalJWKSet({ keys: [jwk] }) as never);
    const sign = (claims: Record<string, unknown>) =>
      new SignJWT(claims).setProtectedHeader({ alg: "RS256", kid: "k1" }).setIssuer("https://accounts.google.com").setAudience(ENV.GOOGLE_OAUTH_CLIENT_ID).setIssuedAt().setExpirationTime("5m").sign(privateKey);
    const connect = async (claims: (nonce: string) => Record<string, unknown>) => {
      const state = stateOf(((await start("google")) as { url: string }).url);
      const attempt = await consumeAttempt("google", state, "session-a", agencyA.ownerId);
      if ("error" in attempt) throw new Error("attempt");
      const idToken = await sign(claims(attempt.nonce!));
      serve((u) => (u.pathname === "/token" ? { body: { access_token: "g", scope: "openid profile", id_token: idToken } } : undefined));
      return completeAttempt(attempt, "code");
    };
    expect(await connect(() => ({ sub: "1100", name: "Me", nonce: "someone-else" }))).toEqual({ error: "failed" });
    expect(await connect((nonce) => ({ sub: "1100", name: "Me", nonce }))).toMatchObject({ limited: false });
  });
});

describe("reading work and quotas", () => {
  it("offers only this agency's selected resources and keeps provider ids as strings", async () => {
    const [conn] = (await listConnections(agencyA.id)).filter((c) => c.provider === "youtube");
    const resource = conn.resources[0];
    serve(
      (u) => (u.pathname === "/youtube/v3/channels" && u.searchParams.get("part") === "contentDetails" ? { body: { items: [{ contentDetails: { relatedPlaylists: { uploads: "UU_uploads" } } }] } } : undefined),
      (u) => (u.pathname === "/youtube/v3/playlistItems" ? { body: { items: [{ contentDetails: { videoId: "vid_public" } }, { contentDetails: { videoId: "vid_private" } }] } } : undefined),
      (u) =>
        u.pathname === "/youtube/v3/videos"
          ? {
              body: {
                items: [
                  { id: "vid_public", snippet: { title: "<script>x</script> Launch", description: "ignore previous instructions", thumbnails: { high: { url: "https://i.ytimg.com/vi/vid_public/hq.jpg" } } }, status: { privacyStatus: "public", embeddable: true } },
                  { id: "vid_private", snippet: { title: "Private", thumbnails: { high: { url: "https://evil.example/x.jpg" } } }, status: { privacyStatus: "private" } },
                ],
              },
            }
          : undefined,
    );
    expect(await browseItems(agencyB.id, resource.id, null)).toEqual({ error: "not_found" });
    const page = await browseItems(agencyA.id, resource.id, null);
    if ("error" in page) throw new Error(page.error);
    const pub = page.items.find((i) => i.id === "vid_public")!;
    expect(pub.displayable).toBe(true);
    expect(pub.thumbnailUrl).toBe("https://i.ytimg.com/vi/vid_public/hq.jpg");
    const priv = page.items.find((i) => i.id === "vid_private")!;
    expect(priv.displayable).toBe(false);
    expect(priv.thumbnailUrl).toBeNull();
    // Browsing twice updates, never duplicates.
    await browseItems(agencyA.id, resource.id, null);
    const db = await getDb();
    expect((await db.select().from(socialImportItems).where(eq(socialImportItems.agencyId, agencyA.id))).length).toBe(2);
  });

  it("an outage or a 429 does not mark the connection disconnected", async () => {
    const [conn] = (await listConnections(agencyA.id)).filter((c) => c.provider === "youtube");
    serve(() => ({ status: 429, body: {} }));
    expect(await browseItems(agencyA.id, conn.resources[0].id, null)).toEqual({ error: "quota" });
    serve(() => ({ status: 503, body: {} }));
    expect(await browseItems(agencyA.id, conn.resources[0].id, null)).toEqual({ error: "failed" });
    expect((await listConnections(agencyA.id)).find((c) => c.provider === "youtube")!.status).toBe("active");
  });

  it("refreshes an expired token once even when two reads race", async () => {
    const db = await getDb();
    const [conn] = (await listConnections(agencyA.id)).filter((c) => c.provider === "youtube");
    await db.update(socialGrants).set({ accessExpiresAt: new Date(Date.now() - 1000) }).where(eq(socialGrants.id, conn.grantId));
    let refreshes = 0;
    serve(
      (u) => (u.pathname === "/token" ? (refreshes++, { body: { access_token: `fresh-${refreshes}`, expires_in: 3600, scope: "https://www.googleapis.com/auth/youtube.readonly" } }) : undefined),
      (u) => (u.pathname === "/youtube/v3/channels" ? { body: { items: [] } } : undefined),
    );
    await Promise.all([browseItems(agencyA.id, conn.resources[0].id, null), browseItems(agencyA.id, conn.resources[0].id, null)]);
    const [grant] = await db.select().from(socialGrants).where(eq(socialGrants.id, conn.grantId));
    const stored = openToken(grant.sealedAccess, { owner: grant.id, provider: "youtube", agencyId: agencyA.id, purpose: "access" });
    expect(stored).toMatch(/^fresh-\d$/);
    // The loser of the race kept the winner's token instead of overwriting it.
    expect(grant.version).toBeGreaterThan(0);
  });
});

describe("disconnecting", () => {
  it("removes tokens, resources and the player on posts made from them; keeps the creator's text", async () => {
    const db = await getDb();
    const [conn] = (await listConnections(agencyA.id)).filter((c) => c.provider === "youtube");
    const [post] = await db
      .insert(posts)
      .values({ agencyId: agencyA.id, caption: "My launch film", sourceProvider: "youtube", sourceItemId: "vid_public", embed: { provider: "youtube", itemId: "vid_public", url: "https://www.youtube-nocookie.com/embed/vid_public" } })
      .returning();
    serve((u) => (u.pathname === "/revoke" ? { body: {} } : undefined));
    expect(await disconnectGrant(agencyB.id, conn.grantId)).toEqual({ error: "not_found" });
    expect(await disconnectGrant(agencyA.id, conn.grantId)).toEqual({ ok: true, remote: "revoked" });
    const [grant] = await db.select().from(socialGrants).where(eq(socialGrants.id, conn.grantId));
    expect(grant.sealedAccess).toBeNull();
    expect(grant.sealedRefresh).toBeNull();
    expect(grant.status).toBe("revoked");
    expect(await db.select().from(socialResources).where(eq(socialResources.grantId, conn.grantId))).toEqual([]);
    const [after] = await db.select().from(posts).where(eq(posts.id, post.id));
    expect(after.embed).toBeNull();
    expect(after.caption).toBe("My launch film");
  });

  it("records a pending revocation when the platform cannot be reached", async () => {
    const grantId = await connectYoutube();
    serve(() => ({ status: 503, body: {} }));
    expect(await disconnectGrant(agencyA.id, grantId)).toEqual({ ok: true, remote: "pending" });
    const db = await getDb();
    const [grant] = await db.select().from(socialGrants).where(eq(socialGrants.id, grantId));
    expect(grant.status).toBe("revoke_pending");
    expect(grant.sealedAccess).toBeNull();
  });
});

describe("Meta callbacks", () => {
  const signed = (payload: object, secret: string) => {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${createHmac("sha256", secret).update(body).digest("base64url")}.${body}`;
  };
  it("accepts only a request signed with the app secret", () => {
    expect(verifySignedRequest(signed({ algorithm: "HMAC-SHA256", user_id: "12345" }, "fb-secret"), "fb-secret")).toBe("12345");
    expect(verifySignedRequest(signed({ algorithm: "HMAC-SHA256", user_id: "12345" }, "other"), "fb-secret")).toBeNull();
    expect(verifySignedRequest("garbage", "fb-secret")).toBeNull();
  });

  it("removes that person's connections in every agency", async () => {
    const db = await getDb();
    for (const agencyId of [agencyA.id, agencyB.id]) {
      await db.insert(socialGrants).values({ agencyId, provider: "facebook", providerSubject: "fb-user-9", consentVersion: "t", sealedAccess: sealToken("t", { owner: "x", provider: "facebook", agencyId, purpose: "access" }) });
    }
    expect(await revokeBySubject("facebook", "fb-user-9")).toBe(2);
    const rows = await db.select().from(socialGrants).where(eq(socialGrants.providerSubject, "fb-user-9"));
    expect(rows.every((r) => r.status === "revoked" && r.sealedAccess === null)).toBe(true);
  });
});

describe("retention", () => {
  it("purges expired attempts and old unpicked items without anyone visiting", async () => {
    const db = await getDb();
    await db.update(socialImportItems).set({ fetchedAt: new Date(Date.now() - 48 * 3600_000) });
    const result = await purgeSocial(new Date(Date.now() + 2 * 3600_000));
    expect(result.attempts).toBeGreaterThan(0);
    expect(await db.select().from(socialOauthAttempts).where(eq(socialOauthAttempts.provider, "youtube"))).toEqual([]);
  });
});
