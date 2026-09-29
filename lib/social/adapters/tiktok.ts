import "server-only";
import { ProviderError, providerId, providerJson, safeUrl, str } from "@/lib/social/http";
import type { ItemPage, SocialAdapter, SourceItem, TokenSet } from "@/lib/social/types";

// TikTok Login Kit + Display API (docs/53): user.info.basic and video.list,
// public videos and their official embed links. No Content Posting API, no
// video downloads. Cover image links expire and are re-read, never stored.
const SCOPES = ["user.info.basic", "video.list"] as const;
const API = "https://open.tiktokapis.com/v2";
const TT_HOSTS = /(^|\.)(tiktokcdn\.com|tiktokcdn-us\.com|tiktok\.com)$/;

function tokenSet(t: Record<string, unknown>): TokenSet {
  const accessToken = str(t.access_token, 4000);
  if (!accessToken) throw new ProviderError(str(t.error, 60) === "invalid_grant" ? "expired" : "invalid");
  return {
    accessToken,
    refreshToken: str(t.refresh_token, 4000) || null,
    expiresIn: typeof t.expires_in === "number" ? t.expires_in : null,
    refreshExpiresIn: typeof t.refresh_expires_in === "number" ? t.refresh_expires_in : null,
    scopes: str(t.scope, 500).split(",").map((s) => s.trim()).filter(Boolean),
    subject: providerId(t.open_id),
  };
}

export const tiktok: SocialAdapter = {
  id: "tiktok",
  scopes: SCOPES,
  requiredScopes: SCOPES,
  // TikTok's web Login Kit flow uses state; PKCE is documented for desktop/mobile apps only.
  pkce: false,
  openid: false,
  imports: true,
  authorizeUrl(config, p) {
    const u = new URL("https://www.tiktok.com/v2/auth/authorize/");
    u.search = new URLSearchParams({ client_key: config.clientId, scope: SCOPES.join(","), response_type: "code", redirect_uri: config.redirectUri, state: p.state }).toString();
    return u.toString();
  },
  async exchange(config, code) {
    return tokenSet(await providerJson(`${API}/oauth/token/`, { form: { client_key: config.clientId, client_secret: config.clientSecret, code, grant_type: "authorization_code", redirect_uri: config.redirectUri } }));
  },
  async refresh(config, refreshToken) {
    return tokenSet(await providerJson(`${API}/oauth/token/`, { form: { client_key: config.clientId, client_secret: config.clientSecret, grant_type: "refresh_token", refresh_token: refreshToken } }));
  },
  async revoke(config, token) {
    await providerJson(`${API}/oauth/revoke/`, { form: { client_key: config.clientId, client_secret: config.clientSecret, token } });
    return true;
  },
  async identify(_, tokens) {
    const r = await providerJson<{ data?: { user?: Record<string, unknown> } }>(`${API}/user/info/?fields=open_id,display_name`, { token: tokens.accessToken });
    const user = r.data?.user ?? {};
    const subject = providerId(user.open_id) ?? tokens.subject ?? null;
    if (!subject) throw new ProviderError("invalid");
    return { subject, name: str(user.display_name, 120) || "TikTok" };
  },
  async resources(_, __, identity) {
    return [{ kind: "account", id: identity.subject, name: identity.name }];
  },
  async listItems(_, token, _resource, cursor): Promise<ItemPage> {
    const r = await providerJson<{ data?: { videos?: Record<string, unknown>[]; cursor?: unknown; has_more?: unknown }; error?: { code?: unknown } }>(
      `${API}/video/list/?fields=id,title,video_description,create_time,cover_image_url,share_url,embed_link`,
      { json: { max_count: 20, ...(cursor && /^\d+$/.test(cursor) ? { cursor: Number(cursor) } : {}) }, token },
    );
    if (r.error?.code && r.error.code !== "ok") throw new ProviderError(r.error.code === "access_token_invalid" ? "expired" : "permission");
    const items: SourceItem[] = (r.data?.videos ?? []).flatMap((v) => {
      const id = providerId(v.id);
      const permalink = safeUrl(v.share_url, /^(www\.|vm\.)?tiktok\.com$/);
      if (!id || !permalink) return [];
      const created = typeof v.create_time === "number" ? new Date(v.create_time * 1000).toISOString() : null;
      return [{ id, mediaKind: "video" as const, title: str(v.title, 200), caption: str(v.video_description, 2000), permalink, thumbnailUrl: safeUrl(v.cover_image_url, TT_HOSTS), publishedAt: created, displayable: Boolean(safeUrl(v.embed_link, /^(www\.)?tiktok\.com$/)) }];
    });
    const more = r.data?.has_more === true;
    const next = more && (typeof r.data?.cursor === "number" || typeof r.data?.cursor === "string") ? String(r.data.cursor) : null;
    return { items, next, units: 1 };
  },
};
