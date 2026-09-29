import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { ProviderError, providerId, providerJson, safeUrl, str } from "@/lib/social/http";
import type { AdapterConfig, ItemPage, SocialAdapter, SourceItem, TokenSet } from "@/lib/social/types";

// Google identity (OpenID Connect) and YouTube Data API v3 (docs/53). Two
// separate consents: linking a Google identity asks only openid + profile and
// grants no YouTube access; YouTube asks only youtube.readonly.
const AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const REVOKE = "https://oauth2.googleapis.com/revoke";
const YT = "https://www.googleapis.com/youtube/v3";
const YT_READONLY = "https://www.googleapis.com/auth/youtube.readonly";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
/** Test seam: a local key set instead of Google's published keys. */
export function setGoogleKeys(keys: ReturnType<typeof createRemoteJWKSet> | null) {
  jwks = keys;
}
const googleKeys = () => (jwks ??= createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs")));

function authorizeUrl(scopes: readonly string[], offline: boolean) {
  return (config: AdapterConfig, p: { state: string; challenge?: string; nonce?: string }) => {
    const u = new URL(AUTHORIZE);
    u.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      state: p.state,
      ...(p.challenge ? { code_challenge: p.challenge, code_challenge_method: "S256" } : {}),
      ...(p.nonce ? { nonce: p.nonce } : {}),
      ...(offline ? { access_type: "offline" } : {}),
      // Each consent screen asks for its own purpose only (no include_granted_scopes).
      prompt: "select_account consent",
    }).toString();
    return u.toString();
  };
}

async function exchange(config: AdapterConfig, code: string, verifier?: string): Promise<TokenSet> {
  const t = await providerJson<Record<string, unknown>>(TOKEN, {
    form: { code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code", ...(verifier ? { code_verifier: verifier } : {}) },
  });
  const accessToken = str(t.access_token, 4000);
  if (!accessToken) throw new ProviderError("invalid");
  return {
    accessToken,
    refreshToken: str(t.refresh_token, 4000) || null,
    expiresIn: typeof t.expires_in === "number" ? t.expires_in : null,
    scopes: str(t.scope, 2000).split(" ").filter(Boolean),
    idToken: str(t.id_token, 8000) || null,
  };
}

async function refresh(config: AdapterConfig, refreshToken: string): Promise<TokenSet> {
  const t = await providerJson<Record<string, unknown>>(TOKEN, {
    form: { client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" },
  });
  const accessToken = str(t.access_token, 4000);
  if (!accessToken) throw new ProviderError("expired");
  return { accessToken, refreshToken: str(t.refresh_token, 4000) || refreshToken, expiresIn: typeof t.expires_in === "number" ? t.expires_in : null, scopes: str(t.scope, 2000).split(" ").filter(Boolean) };
}

async function revoke(_: AdapterConfig, token: string) {
  await providerJson(REVOKE, { form: { token } });
  return true;
}

/** Verifies Google's ID token with its published keys: issuer, audience, signature, expiry and nonce. */
export async function verifyGoogleIdToken(idToken: string, clientId: string, nonce: string) {
  const { payload } = await jwtVerify(idToken, googleKeys(), { issuer: ISSUERS, audience: clientId, clockTolerance: 60 }).catch(() => {
    throw new ProviderError("invalid");
  });
  if (payload.nonce !== nonce) throw new ProviderError("invalid");
  const subject = providerId(payload.sub);
  if (!subject) throw new ProviderError("invalid");
  return { subject, name: str(payload.name, 120) || str(payload.given_name, 120) || "Google" };
}

export const googleIdentity: SocialAdapter = {
  id: "google",
  scopes: ["openid", "profile"],
  requiredScopes: ["openid"],
  pkce: true,
  openid: true,
  imports: false,
  authorizeUrl: authorizeUrl(["openid", "profile"], false),
  exchange,
  async identify(config, tokens, nonce) {
    if (!tokens.idToken || !nonce) throw new ProviderError("invalid");
    return verifyGoogleIdToken(tokens.idToken, config.clientId, nonce);
  },
  async resources(_, __, identity) {
    return [{ kind: "identity", id: identity.subject, name: identity.name }];
  },
  revoke,
};

const YT_HOSTS = /^(i\d?\.ytimg\.com|yt\d\.ggpht\.com)$/;

export const youtube: SocialAdapter = {
  id: "youtube",
  scopes: [YT_READONLY],
  requiredScopes: [YT_READONLY],
  pkce: true,
  openid: false,
  imports: true,
  authorizeUrl: authorizeUrl([YT_READONLY], true),
  exchange,
  refresh: (config, refreshToken) => refresh(config, refreshToken),
  revoke,
  async identify(_, tokens) {
    const data = await providerJson<{ items?: Record<string, unknown>[] }>(`${YT}/channels?part=snippet&mine=true&maxResults=50`, { token: tokens.accessToken });
    const first = (data.items ?? []).map((c) => providerId(c.id)).find(Boolean);
    if (!first) throw new ProviderError("permission"); // a Google account with no channel
    const snippet = (data.items?.[0]?.snippet ?? {}) as Record<string, unknown>;
    return { subject: first, name: str(snippet.title, 120) || "YouTube", handle: str(snippet.customUrl, 80) || null };
  },
  async resources(_, tokens) {
    const data = await providerJson<{ items?: Record<string, unknown>[] }>(`${YT}/channels?part=snippet&mine=true&maxResults=50`, { token: tokens.accessToken });
    return (data.items ?? []).flatMap((c) => {
      const id = providerId(c.id);
      const snippet = (c.snippet ?? {}) as Record<string, unknown>;
      return id ? [{ kind: "channel" as const, id, name: str(snippet.title, 120) || id, handle: str(snippet.customUrl, 80) || null }] : [];
    });
  },
  async listItems(_, token, resource, cursor): Promise<ItemPage> {
    const channels = await providerJson<{ items?: Record<string, unknown>[] }>(`${YT}/channels?part=contentDetails&id=${encodeURIComponent(resource.id)}`, { token });
    const uploads = providerId(((channels.items?.[0]?.contentDetails as Record<string, Record<string, unknown>> | undefined)?.relatedPlaylists ?? {}).uploads);
    if (!uploads) return { items: [], next: null, units: 1 };
    const page = await providerJson<{ items?: Record<string, unknown>[]; nextPageToken?: unknown }>(
      `${YT}/playlistItems?part=contentDetails&maxResults=24&playlistId=${encodeURIComponent(uploads)}${cursor ? `&pageToken=${encodeURIComponent(cursor)}` : ""}`,
      { token },
    );
    const ids = (page.items ?? []).map((i) => providerId((i.contentDetails as Record<string, unknown> | undefined)?.videoId)).filter((v): v is string => Boolean(v));
    if (!ids.length) return { items: [], next: null, units: 2 };
    const videos = await providerJson<{ items?: Record<string, unknown>[] }>(`${YT}/videos?part=snippet,status&id=${ids.map(encodeURIComponent).join(",")}`, { token });
    const items: SourceItem[] = (videos.items ?? []).flatMap((v) => {
      const id = providerId(v.id);
      if (!id) return [];
      const snippet = (v.snippet ?? {}) as Record<string, unknown>;
      const status = (v.status ?? {}) as Record<string, unknown>;
      const thumbs = (snippet.thumbnails ?? {}) as Record<string, { url?: unknown }>;
      return [{
        id,
        mediaKind: "video" as const,
        title: str(snippet.title, 200),
        caption: str(snippet.description, 2000),
        permalink: `https://www.youtube.com/watch?v=${id}`,
        thumbnailUrl: safeUrl((thumbs.high ?? thumbs.medium ?? thumbs.default)?.url, YT_HOSTS),
        publishedAt: str(snippet.publishedAt, 40) || null,
        // Only public videos the owner allows on other sites.
        displayable: status.privacyStatus === "public" && status.embeddable !== false,
      }];
    });
    const next = str(page.nextPageToken, 200) || null;
    return { items, next, units: 3 };
  },
};
