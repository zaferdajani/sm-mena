import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, gt, inArray, isNull, lt, notInArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { portfolioClients, posts, socialDeletionRequests, socialGrants, socialImportItems, socialOauthAttempts, socialQuotaUsage, socialResources } from "@/lib/db/schema";
import { openToken, pkceChallenge, randomToken, sealToken, sha256 } from "@/lib/social/crypto";
import { ProviderError } from "@/lib/social/http";
import { ADAPTERS, adapterConfig, readiness, type SocialProviderId } from "@/lib/social/providers";
import type { SourceItem, TokenSet } from "@/lib/social/types";

// Creator platform connections (docs/53). Every read and write here is scoped
// to one agency; ids from the browser are only ever looked up together with
// that agency. Tokens are sealed and never leave this module: callers get
// explicit projections without them.

export const CONSENT_VERSION = "social-2026-09";
const ATTEMPT_MINUTES = 10;
const PENDING_MINUTES = 30;
/** Daily API units Sawwiq allows itself per provider (below the platforms' own quotas). */
const DAILY_UNITS: Record<SocialProviderId, number> = { google: 0, youtube: 8000, instagram: 4000, facebook: 4000, tiktok: 4000 };

export type SocialError = "unavailable" | "client" | "mismatch" | "expired" | "denied" | "partial" | "personal" | "no_resources" | "quota" | "permission" | "failed" | "not_found";
export type ReturnTo = "setup" | "connections";

// ---------------------------------------------------------------------------
// 1. Start: a hashed, single-use state bound to this session, user and agency.
// ---------------------------------------------------------------------------

export async function startAttempt(input: {
  provider: SocialProviderId;
  userId: string;
  agencyId: string;
  sessionId: string;
  ownership: "own" | "client";
  clientId: string | null;
  locale: string;
  returnTo: ReturnTo;
}): Promise<{ url: string } | { error: SocialError }> {
  const config = adapterConfig(input.provider);
  if (!config) return { error: "unavailable" };
  const db = await getDb();
  // A managed-client connection may name one of this agency's own clients, never another's.
  if (input.clientId) {
    const [own] = await db.select({ id: portfolioClients.id }).from(portfolioClients).where(and(eq(portfolioClients.id, input.clientId), eq(portfolioClients.agencyId, input.agencyId)));
    if (!own) return { error: "client" };
  }
  const adapter = ADAPTERS[input.provider];
  const state = randomToken();
  const verifier = adapter.pkce ? randomToken(48) : undefined;
  const nonce = adapter.openid ? randomToken() : undefined;
  const id = randomUUID();
  const ctx = { owner: id, provider: input.provider, agencyId: input.agencyId };
  await db.insert(socialOauthAttempts).values({
    id,
    stateHash: sha256(state),
    provider: input.provider,
    userId: input.userId,
    agencyId: input.agencyId,
    sessionHash: input.sessionId,
    ownership: input.ownership,
    clientId: input.ownership === "client" ? input.clientId : null,
    locale: input.locale === "en" ? "en" : "ar",
    returnTo: input.returnTo,
    sealedVerifier: verifier ? sealToken(verifier, { ...ctx, purpose: "verifier" }) : null,
    sealedNonce: nonce ? sealToken(nonce, { ...ctx, purpose: "nonce" }) : null,
    expiresAt: new Date(Date.now() + ATTEMPT_MINUTES * 60_000),
  });
  return { url: adapter.authorizeUrl(config, { state, challenge: verifier ? pkceChallenge(verifier) : undefined, nonce }) };
}

export type ConsumedAttempt = { id: string; provider: SocialProviderId; agencyId: string; userId: string; ownership: "own" | "client"; clientId: string | null; locale: string; returnTo: ReturnTo; verifier?: string; nonce?: string };

/**
 * Takes an attempt exactly once. The state must match an unexpired, unused
 * attempt for this provider, started by this user in this browser session;
 * anything else (replay, provider swap, another account, a stale link) fails.
 */
export async function consumeAttempt(provider: SocialProviderId, state: string, sessionId: string | null, userId: string | null): Promise<ConsumedAttempt | { error: "mismatch" | "expired" }> {
  if (!state || state.length > 200 || !sessionId || !userId) return { error: "mismatch" };
  const db = await getDb();
  const [row] = await db
    .update(socialOauthAttempts)
    .set({ consumedAt: new Date() })
    .where(and(eq(socialOauthAttempts.stateHash, sha256(state)), eq(socialOauthAttempts.provider, provider), eq(socialOauthAttempts.sessionHash, sessionId), eq(socialOauthAttempts.userId, userId), isNull(socialOauthAttempts.consumedAt)))
    .returning();
  if (!row) return { error: "mismatch" };
  if (row.expiresAt.getTime() <= Date.now()) return { error: "expired" };
  if (row.provider !== provider || row.sessionHash !== sessionId || row.userId !== userId) return { error: "mismatch" };
  const ctx = { owner: row.id, provider: row.provider, agencyId: row.agencyId };
  return {
    id: row.id,
    provider: row.provider,
    agencyId: row.agencyId,
    userId: row.userId,
    ownership: row.ownership,
    clientId: row.clientId,
    locale: row.locale,
    returnTo: row.returnTo === "setup" ? "setup" : "connections",
    verifier: openToken(row.sealedVerifier, { ...ctx, purpose: "verifier" }) ?? undefined,
    nonce: openToken(row.sealedNonce, { ...ctx, purpose: "nonce" }) ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// 2. Callback: exchange server-side, check the grant, save it sealed, and list
//    the resources it reaches as a short-lived pending selection.
// ---------------------------------------------------------------------------

const grantCtx = (grantId: string, provider: string, agencyId: string) => ({ owner: grantId, provider, agencyId });

export async function completeAttempt(attempt: ConsumedAttempt, code: string): Promise<{ grantId: string; limited: boolean } | { error: SocialError }> {
  const config = adapterConfig(attempt.provider);
  if (!config) return { error: "unavailable" };
  const adapter = ADAPTERS[attempt.provider];
  let tokens: TokenSet;
  try {
    tokens = await adapter.exchange(config, code, attempt.verifier);
    const granted = new Set(tokens.scopes);
    const missing = adapter.requiredScopes.filter((s) => !granted.has(s));
    const identity = await adapter.identify(config, tokens, attempt.nonce);
    const candidates = await adapter.resources(config, tokens, identity);
    const db = await getDb();
    const now = Date.now();
    const grantId = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: socialGrants.id })
        .from(socialGrants)
        .where(and(eq(socialGrants.agencyId, attempt.agencyId), eq(socialGrants.provider, attempt.provider), eq(socialGrants.providerSubject, identity.subject)));
      const id = existing?.id ?? randomUUID();
      const ctx = grantCtx(id, attempt.provider, attempt.agencyId);
      const values = {
        userId: attempt.userId,
        scopes: tokens.scopes.slice(0, 20),
        sealedAccess: sealToken(tokens.accessToken, { ...ctx, purpose: "access" }),
        sealedRefresh: tokens.refreshToken ? sealToken(tokens.refreshToken, { ...ctx, purpose: "refresh" }) : null,
        accessExpiresAt: tokens.expiresIn ? new Date(now + tokens.expiresIn * 1000) : null,
        refreshExpiresAt: tokens.refreshExpiresIn ? new Date(now + tokens.refreshExpiresIn * 1000) : null,
        status: missing.length ? ("limited" as const) : ("active" as const),
        statusReason: missing.length ? "partial" : null,
        consentVersion: CONSENT_VERSION,
        lastVerifiedAt: new Date(),
        updatedAt: new Date(),
      };
      if (existing) await tx.update(socialGrants).set({ ...values, version: sql`${socialGrants.version} + 1` }).where(eq(socialGrants.id, id));
      else await tx.insert(socialGrants).values({ id, agencyId: attempt.agencyId, provider: attempt.provider, providerSubject: identity.subject, ...values });
      for (const c of candidates.slice(0, 50)) {
        const sealedToken = c.token ? sealToken(c.token, { owner: `${id}:${c.id}`, provider: attempt.provider, agencyId: attempt.agencyId, purpose: "page" }) : null;
        await tx
          .insert(socialResources)
          .values({
            grantId: id,
            agencyId: attempt.agencyId,
            provider: attempt.provider,
            kind: c.kind,
            providerResourceId: c.id,
            displayName: c.name,
            handle: c.handle ?? null,
            ownership: attempt.ownership,
            clientId: attempt.clientId,
            status: "pending",
            sealedToken,
            pendingExpiresAt: new Date(now + PENDING_MINUTES * 60_000),
          })
          .onConflictDoUpdate({
            target: [socialResources.agencyId, socialResources.provider, socialResources.providerResourceId],
            // A resource already chosen stays chosen; its grant, name and token are refreshed.
            set: { grantId: id, kind: c.kind, displayName: c.name, handle: c.handle ?? null, sealedToken, metadataFetchedAt: new Date(), pendingExpiresAt: new Date(now + PENDING_MINUTES * 60_000) },
          });
      }
      return id;
    });
    if (!candidates.length) return { error: "no_resources" };
    return { grantId, limited: missing.length > 0 };
  } catch (e) {
    if (e instanceof ProviderError) {
      if (e.code === "permission" && attempt.provider === "instagram") return { error: "personal" };
      if (e.code === "permission" && attempt.provider === "youtube") return { error: "no_resources" };
      return { error: e.code === "quota" ? "quota" : e.code === "expired" ? "expired" : e.code === "permission" ? "permission" : "failed" };
    }
    return { error: "failed" };
  }
}

// ---------------------------------------------------------------------------
// 3. Selection: the creator confirms resources that the grant actually listed.
// ---------------------------------------------------------------------------

export type ResourceView = { id: string; provider: SocialProviderId; kind: string; name: string; handle: string | null; ownership: "own" | "client"; clientId: string | null; status: "pending" | "selected" | "removed" };
const resourceView = (r: typeof socialResources.$inferSelect): ResourceView => ({ id: r.id, provider: r.provider, kind: r.kind, name: r.displayName, handle: r.handle, ownership: r.ownership, clientId: r.clientId, status: r.status });

export async function pendingResources(agencyId: string, grantId: string): Promise<ResourceView[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(socialResources)
    .where(and(eq(socialResources.agencyId, agencyId), eq(socialResources.grantId, grantId)));
  return rows.filter((r) => r.status === "selected" || (r.pendingExpiresAt && r.pendingExpiresAt.getTime() > Date.now())).map(resourceView);
}

/** Keeps the chosen resources (only ids this agency's grant listed); the rest of that pending list is dropped. */
export async function confirmResources(agencyId: string, grantId: string, resourceIds: string[]): Promise<{ ok: true; selected: number } | { error: SocialError }> {
  const db = await getDb();
  const rows = await db.select().from(socialResources).where(and(eq(socialResources.agencyId, agencyId), eq(socialResources.grantId, grantId)));
  if (!rows.length) return { error: "not_found" };
  const wanted = new Set(resourceIds);
  const valid = rows.filter((r) => wanted.has(r.id) && (r.status === "selected" || (r.pendingExpiresAt && r.pendingExpiresAt.getTime() > Date.now())));
  if (valid.length !== wanted.size || !valid.length) return { error: "mismatch" };
  await db.transaction(async (tx) => {
    await tx.update(socialResources).set({ status: "selected", selectedAt: new Date(), pendingExpiresAt: null }).where(inArray(socialResources.id, valid.map((r) => r.id)));
    const dropped = rows.filter((r) => r.status === "pending" && !wanted.has(r.id)).map((r) => r.id);
    if (dropped.length) await tx.delete(socialResources).where(inArray(socialResources.id, dropped));
  });
  return { ok: true, selected: valid.length };
}

// ---------------------------------------------------------------------------
// 4. What the Studio shows: explicit projections, no tokens.
// ---------------------------------------------------------------------------

export type ConnectionView = {
  grantId: string;
  provider: SocialProviderId;
  status: "active" | "limited" | "expired" | "revoked" | "revoke_pending" | "failed";
  statusReason: string | null;
  scopes: string[];
  lastVerifiedAt: string | null;
  resources: ResourceView[];
};

export async function listConnections(agencyId: string): Promise<ConnectionView[]> {
  const db = await getDb();
  const grants = await db
    .select({ id: socialGrants.id, provider: socialGrants.provider, status: socialGrants.status, statusReason: socialGrants.statusReason, scopes: socialGrants.scopes, lastVerifiedAt: socialGrants.lastVerifiedAt })
    .from(socialGrants)
    .where(eq(socialGrants.agencyId, agencyId));
  if (!grants.length) return [];
  const resources = await db.select().from(socialResources).where(and(eq(socialResources.agencyId, agencyId), eq(socialResources.status, "selected")));
  return grants.map((g) => ({
    grantId: g.id,
    provider: g.provider,
    status: g.status,
    statusReason: g.statusReason,
    scopes: g.scopes,
    lastVerifiedAt: g.lastVerifiedAt?.toISOString() ?? null,
    resources: resources.filter((r) => r.grantId === g.id).map(resourceView),
  }));
}

// ---------------------------------------------------------------------------
// 5. Reading published work: token refresh under compare-and-swap, quotas,
//    and a bounded page of items offered for review.
// ---------------------------------------------------------------------------

async function loadResource(agencyId: string, resourceId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ resource: socialResources, grant: socialGrants })
    .from(socialResources)
    .innerJoin(socialGrants, eq(socialGrants.id, socialResources.grantId))
    .where(and(eq(socialResources.id, resourceId), eq(socialResources.agencyId, agencyId), eq(socialGrants.agencyId, agencyId), eq(socialResources.status, "selected")));
  return row ?? null;
}

async function markGrant(grantId: string, status: "expired" | "limited" | "revoked" | "failed", reason: string, version: number) {
  const db = await getDb();
  await db.update(socialGrants).set({ status, statusReason: reason, updatedAt: new Date() })
    .where(and(eq(socialGrants.id, grantId), eq(socialGrants.version, version), notInArray(socialGrants.status, ["revoked", "revoke_pending"])));
}

/** Serialize refresh itself, not merely the final token write. The provider's
 * rotating refresh token must never be sent by two concurrent workers.
 * All DB work in this transaction uses tx; provider calls have bounded timeouts.
 */
async function grantToken(snapshot: typeof socialGrants.$inferSelect): Promise<{ token: string; version: number }> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [grant] = await tx.select().from(socialGrants)
      .where(and(eq(socialGrants.id, snapshot.id), eq(socialGrants.agencyId, snapshot.agencyId))).for("update");
    if (!grant || ["revoked", "revoke_pending"].includes(grant.status)) throw new ProviderError("permission");
    const ctx = grantCtx(grant.id, grant.provider, grant.agencyId);
    const access = openToken(grant.sealedAccess, { ...ctx, purpose: "access" });
    if (!access) throw new ProviderError("expired");
    const soon = grant.accessExpiresAt && grant.accessExpiresAt.getTime() < Date.now() + 5 * 60_000;
    const adapter = ADAPTERS[grant.provider];
    if (!soon || !adapter.refresh) return { token: access, version: grant.version };
    if (grant.refreshExpiresAt && grant.refreshExpiresAt.getTime() <= Date.now()) throw new ProviderError("expired");
    const refreshToken = openToken(grant.sealedRefresh, { ...ctx, purpose: "refresh" });
    const config = adapterConfig(grant.provider);
    if (!config) throw new ProviderError("unavailable");
    if (!refreshToken && grant.provider !== "instagram") throw new ProviderError("expired");
    const next = await adapter.refresh(config, refreshToken ?? access, access);
    await tx.update(socialGrants).set({
      sealedAccess: sealToken(next.accessToken, { ...ctx, purpose: "access" }),
      ...(next.refreshToken ? { sealedRefresh: sealToken(next.refreshToken, { ...ctx, purpose: "refresh" }) } : {}),
      accessExpiresAt: next.expiresIn ? new Date(Date.now() + next.expiresIn * 1000) : null,
      ...(next.refreshExpiresIn ? { refreshExpiresAt: new Date(Date.now() + next.refreshExpiresIn * 1000) } : {}),
      version: grant.version + 1, lastVerifiedAt: new Date(), updatedAt: new Date(),
    }).where(and(eq(socialGrants.id, grant.id), eq(socialGrants.agencyId, grant.agencyId), eq(socialGrants.version, grant.version)));
    return { token: next.accessToken, version: grant.version + 1 };
  });
}

const today = () => new Date().toISOString().slice(0, 10);

/** Reserves API units for today; false when this provider's daily budget is spent. */
export async function reserveUnits(provider: SocialProviderId, units: number): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .insert(socialQuotaUsage)
    .values({ provider, day: today(), units })
    .onConflictDoUpdate({ target: [socialQuotaUsage.provider, socialQuotaUsage.day], set: { units: sql`${socialQuotaUsage.units} + ${units}` } })
    .returning({ units: socialQuotaUsage.units });
  return row.units <= DAILY_UNITS[provider];
}

export type OfferedItem = SourceItem & { rowId: string; state: "offered" | "draft" | "published" | "dismissed"; postId: string | null };

/** One page of a connected resource's published work, stored briefly so a pick is looked up server-side, never trusted from the form. */
export async function browseItems(agencyId: string, resourceId: string, cursor: string | null): Promise<{ items: OfferedItem[]; next: string | null } | { error: SocialError }> {
  const row = await loadResource(agencyId, resourceId);
  if (!row) return { error: "not_found" };
  const { resource, grant } = row;
  if (grant.status === "revoked" || grant.status === "revoke_pending") return { error: "permission" };
  const adapter = ADAPTERS[resource.provider];
  const config = adapterConfig(resource.provider);
  if (!config || !adapter.listItems) return { error: "unavailable" };
  if (!(await reserveUnits(resource.provider, 3))) return { error: "quota" };
  let requestVersion = grant.version;
  try {
    const current = await grantToken(grant);
    requestVersion = current.version;
    const token = resource.sealedToken
      ? openToken(resource.sealedToken, { owner: `${grant.id}:${resource.providerResourceId}`, provider: resource.provider, agencyId, purpose: "page" })
      : current.token;
    if (!token) throw new ProviderError("expired");
    const page = await adapter.listItems(config, token, { kind: resource.kind, id: resource.providerResourceId }, cursor && cursor.length <= 300 ? cursor : null);
    const db = await getDb();
    const out = await db.transaction(async (tx) => {
      const [stillAuthorized] = await tx.select().from(socialGrants)
        .where(and(eq(socialGrants.id, grant.id), eq(socialGrants.agencyId, agencyId))).for("update");
      if (!stillAuthorized || stillAuthorized.version !== requestVersion || ["revoked", "revoke_pending"].includes(stillAuthorized.status)) throw new ProviderError("permission");
      const [stillSelected] = await tx.select({ id: socialResources.id }).from(socialResources)
        .where(and(eq(socialResources.id, resourceId), eq(socialResources.agencyId, agencyId), eq(socialResources.grantId, grant.id), eq(socialResources.status, "selected")));
      if (!stillSelected) throw new ProviderError("permission");
      const offered: OfferedItem[] = [];
      for (const item of page.items.slice(0, 30)) {
        if (!item.displayable) {
          // A disabled button is not authorization. Keep unembeddable/private
          // items out of the selectable table, and invalidate an earlier offer.
          await tx.delete(socialImportItems).where(and(eq(socialImportItems.agencyId, agencyId), eq(socialImportItems.provider, resource.provider), eq(socialImportItems.providerItemId, item.id)));
          await tx.update(posts).set({ embed: null }).where(and(eq(posts.agencyId, agencyId), eq(posts.sourceProvider, resource.provider), eq(posts.sourceItemId, item.id)));
          offered.push({ ...item, rowId: `unavailable:${item.id}`, state: "dismissed", postId: null });
          continue;
        }
        const [saved] = await tx.insert(socialImportItems)
          .values({ agencyId, resourceId, provider: resource.provider, providerItemId: item.id, mediaKind: item.mediaKind, title: item.title, caption: item.caption, permalink: item.permalink, thumbnailUrl: item.thumbnailUrl, publishedAt: item.publishedAt ? new Date(item.publishedAt) : null })
          .onConflictDoUpdate({
            target: [socialImportItems.agencyId, socialImportItems.provider, socialImportItems.providerItemId],
            set: { resourceId, title: item.title, caption: item.caption, permalink: item.permalink, thumbnailUrl: item.thumbnailUrl, fetchedAt: new Date() },
          }).returning();
        offered.push({ ...item, rowId: saved.id, state: saved.state, postId: saved.postId });
      }
      await tx.update(socialGrants).set({ lastVerifiedAt: new Date(), status: stillAuthorized.status === "expired" ? "active" : stillAuthorized.status })
        .where(and(eq(socialGrants.id, grant.id), eq(socialGrants.version, requestVersion)));
      return offered;
    });
    return { items: out, next: page.next };
  } catch (e) {
    const code = e instanceof ProviderError ? e.code : "unavailable";
    // Neither stale successful responses nor errors can reopen a disconnected
    // grant or overwrite the health of a newer authorization.
    if (code === "expired") await markGrant(grant.id, "expired", "expired", requestVersion);
    if (code === "permission") await markGrant(grant.id, "limited", "permission", requestVersion);
    return { error: code === "quota" ? "quota" : code === "expired" ? "expired" : code === "permission" ? "permission" : "failed" };
  }
}

/** The offered item this agency picked, if it is still displayable on the platform's terms. */
export async function getItemForAgency(agencyId: string, itemRowId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemRowId)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ item: socialImportItems, resource: socialResources })
    .from(socialImportItems)
    .innerJoin(socialResources, eq(socialResources.id, socialImportItems.resourceId))
    .innerJoin(socialGrants, eq(socialGrants.id, socialResources.grantId))
    .where(and(eq(socialImportItems.id, itemRowId), eq(socialImportItems.agencyId, agencyId), eq(socialResources.agencyId, agencyId), eq(socialGrants.agencyId, agencyId), eq(socialResources.status, "selected"), inArray(socialGrants.status, ["active", "limited"]), gt(socialImportItems.fetchedAt, new Date(Date.now() - 30 * 86_400_000))));
  return row ?? null;
}

export async function stageItem(agencyId: string, itemRowId: string): Promise<{ ok: true } | { error: SocialError }> {
  const row = await getItemForAgency(agencyId, itemRowId);
  if (!row) return { error: "not_found" };
  const db = await getDb();
  await db.update(socialImportItems).set({ state: "draft" }).where(and(eq(socialImportItems.id, itemRowId), eq(socialImportItems.agencyId, agencyId), inArray(socialImportItems.state, ["offered", "dismissed"])));
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 6. Disconnect and platform deauthorization.
// ---------------------------------------------------------------------------

/**
 * Stops everything for a grant at once: tokens are deleted, its resources and
 * picked items removed, and the official player removed from posts made from
 * them (the creator's own caption and uploaded images stay). Then the grant is
 * withdrawn at the platform where it offers that; otherwise it is marked
 * revoke_pending and the creator is told where to remove Sawwiq.
 */
export async function disconnectGrant(agencyId: string, grantId: string): Promise<{ ok: true; remote: "revoked" | "pending" } | { error: SocialError }> {
  const db = await getDb();
  const [grant] = await db.select().from(socialGrants).where(and(eq(socialGrants.id, grantId), eq(socialGrants.agencyId, agencyId)));
  if (!grant) return { error: "not_found" };
  const ctx = grantCtx(grant.id, grant.provider, grant.agencyId);
  const access = openToken(grant.sealedAccess, { ...ctx, purpose: "access" });
  const removedVersion = await removeGrantData(grant.id, agencyId, grant.provider, "revoke_pending", "disconnecting");
  const adapter = ADAPTERS[grant.provider];
  const config = adapterConfig(grant.provider, { requireReady: false });
  let remote: "revoked" | "pending" = "pending";
  if (access && adapter.revoke && config) {
    remote = (await adapter.revoke(config, access).catch(() => false)) ? "revoked" : "pending";
  }
  await db.update(socialGrants).set({ status: remote === "revoked" ? "revoked" : "revoke_pending", statusReason: remote === "revoked" ? "disconnected" : adapter.revoke ? "remote_failed" : "manual", updatedAt: new Date() }).where(and(eq(socialGrants.id, grant.id), eq(socialGrants.agencyId, agencyId), eq(socialGrants.version, removedVersion), eq(socialGrants.status, "revoke_pending")));
  return { ok: true, remote };
}

async function removeGrantData(grantId: string, agencyId: string, provider: SocialProviderId, status: "revoked" | "revoke_pending", reason: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    // Acquire the same first lock used by refresh, source persistence and
    // setup publication, then invalidate every outstanding version.
    const [removed] = await tx.update(socialGrants)
      .set({ sealedAccess: null, sealedRefresh: null, scopes: [], status, statusReason: reason, version: sql`${socialGrants.version} + 1`, updatedAt: new Date() })
      .where(and(eq(socialGrants.id, grantId), eq(socialGrants.agencyId, agencyId))).returning({ version: socialGrants.version });
    if (!removed) return -1;
    const resourceIds = (await tx.select({ id: socialResources.id }).from(socialResources).where(and(eq(socialResources.grantId, grantId), eq(socialResources.agencyId, agencyId)))).map((r) => r.id);
    const itemIds = resourceIds.length
      ? (await tx.select({ id: socialImportItems.providerItemId }).from(socialImportItems).where(inArray(socialImportItems.resourceId, resourceIds))).map((r) => r.id)
      : [];
    if (itemIds.length) {
      await tx.update(posts).set({ embed: null }).where(and(eq(posts.agencyId, agencyId), eq(posts.sourceProvider, provider), inArray(posts.sourceItemId, itemIds)));
    }
    if (resourceIds.length) await tx.delete(socialResources).where(inArray(socialResources.id, resourceIds));
    return removed.version;
  });
}

/** A platform told us this person removed Sawwiq (Meta deauthorize / data deletion): every agency's grant for them goes. */
export async function revokeBySubject(provider: "instagram" | "facebook", subject: string): Promise<number> {
  const db = await getDb();
  const grants = await db.select({ id: socialGrants.id, agencyId: socialGrants.agencyId }).from(socialGrants).where(and(eq(socialGrants.provider, provider), eq(socialGrants.providerSubject, subject)));
  for (const g of grants) await removeGrantData(g.id, g.agencyId, provider, "revoked", "platform_removed");
  return grants.length;
}

export async function recordDeletionRequest(provider: "instagram" | "facebook", grants: number): Promise<string> {
  const code = randomToken(12);
  const db = await getDb();
  await db.insert(socialDeletionRequests).values({ code, provider, grants });
  return code;
}

export async function getDeletionRequest(code: string) {
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(code)) return null;
  const db = await getDb();
  const [row] = await db.select().from(socialDeletionRequests).where(eq(socialDeletionRequests.code, code));
  return row ?? null;
}

// ---------------------------------------------------------------------------
// 7. Retention (daily cron): runs whether or not anyone visits a page.
// ---------------------------------------------------------------------------

export async function purgeSocial(now = new Date()) {
  const db = await getDb();
  const hours = (h: number) => new Date(now.getTime() - h * 3600_000);
  const attempts = await db.delete(socialOauthAttempts).where(lt(socialOauthAttempts.expiresAt, hours(1))).returning({ id: socialOauthAttempts.id });
  const pending = await db.delete(socialResources).where(and(eq(socialResources.status, "pending"), lt(socialResources.pendingExpiresAt, now))).returning({ id: socialResources.id });
  // Browsed but not picked: a day. Picked metadata: 30 days (YouTube's rule, applied to every provider).
  const offered = await db.delete(socialImportItems).where(and(eq(socialImportItems.state, "offered"), lt(socialImportItems.fetchedAt, hours(24)))).returning({ id: socialImportItems.id });
  const stale = await db.delete(socialImportItems).where(and(inArray(socialImportItems.state, ["draft", "dismissed"]), lt(socialImportItems.fetchedAt, hours(24 * 30)))).returning({ id: socialImportItems.id });
  // Published items keep only the id and link; their titles/captions/thumbnails are cleared after 30 days.
  await db.update(socialImportItems).set({ title: "", caption: "", thumbnailUrl: null }).where(and(eq(socialImportItems.state, "published"), lt(socialImportItems.fetchedAt, hours(24 * 30))));
  const quota = await db.delete(socialQuotaUsage).where(lt(socialQuotaUsage.day, hours(24 * 30).toISOString().slice(0, 10))).returning({ day: socialQuotaUsage.day });
  const deletions = await db.delete(socialDeletionRequests).where(lt(socialDeletionRequests.createdAt, hours(24 * 180))).returning({ code: socialDeletionRequests.code });
  return { attempts: attempts.length, pending: pending.length, offered: offered.length, stale: stale.length, quota: quota.length, deletions: deletions.length };
}

/** Shown in the UI: which providers can be connected now, and why not otherwise. */
export function providerStates() {
  return (Object.keys(ADAPTERS) as SocialProviderId[]).map((p) => ({ provider: p, readiness: readiness(p), imports: ADAPTERS[p].imports }));
}

