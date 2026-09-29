import "server-only";
import { ProviderError, providerId, providerJson, safeUrl, str } from "@/lib/social/http";
import type { AdapterConfig, ItemPage, SocialAdapter, SourceItem, TokenSet } from "@/lib/social/types";

// Instagram API with Instagram Login (docs/53): professional (Business or
// Creator) accounts, read-only instagram_business_basic. This is NOT the
// Facebook-Login configuration (instagram_basic) and not the discontinued Basic
// Display API; the two configurations are never mixed. No Facebook Page needed.
const SCOPE = "instagram_business_basic";
const graph = (config: AdapterConfig) => `https://graph.instagram.com/${config.graphVersion}`;
const IG_HOSTS = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/;

export const instagram: SocialAdapter = {
  id: "instagram",
  scopes: [SCOPE],
  requiredScopes: [SCOPE],
  // Instagram Login's web flow documents no PKCE parameters; none are sent.
  pkce: false,
  openid: false,
  imports: true,
  authorizeUrl(config, p) {
    const u = new URL("https://www.instagram.com/oauth/authorize");
    u.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: "code", scope: SCOPE, state: p.state }).toString();
    return u.toString();
  },
  async exchange(config, code): Promise<TokenSet> {
    const raw = await providerJson<Record<string, unknown>>("https://api.instagram.com/oauth/access_token", {
      form: { client_id: config.clientId, client_secret: config.clientSecret, grant_type: "authorization_code", redirect_uri: config.redirectUri, code },
    });
    // The response is either flat or wrapped in data[0].
    const t = (Array.isArray(raw.data) ? (raw.data[0] as Record<string, unknown>) : raw) ?? {};
    const shortToken = str(t.access_token, 4000);
    if (!shortToken) throw new ProviderError("invalid");
    const granted = Array.isArray(t.permissions) ? t.permissions.map((p) => str(p, 80)) : str(t.permissions, 500).split(",");
    // Swap the one-hour token for the long-lived one (60 days, refreshable).
    const long = await providerJson<Record<string, unknown>>(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(config.clientSecret)}&access_token=${encodeURIComponent(shortToken)}`,
    );
    const accessToken = str(long.access_token, 4000);
    if (!accessToken) throw new ProviderError("invalid");
    return { accessToken, refreshToken: null, expiresIn: typeof long.expires_in === "number" ? long.expires_in : null, scopes: granted.map((s) => s.trim()).filter(Boolean), subject: providerId(t.user_id) };
  },
  async refresh(_, __, accessToken): Promise<TokenSet> {
    const t = await providerJson<Record<string, unknown>>(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(accessToken)}`);
    const next = str(t.access_token, 4000);
    if (!next) throw new ProviderError("expired");
    return { accessToken: next, expiresIn: typeof t.expires_in === "number" ? t.expires_in : null, scopes: [SCOPE] };
  },
  async identify(config, tokens) {
    const me = await providerJson<Record<string, unknown>>(`${graph(config)}/me?fields=user_id,username,account_type`, { token: tokens.accessToken });
    const subject = providerId(me.user_id) ?? tokens.subject ?? null;
    if (!subject) throw new ProviderError("invalid");
    // Personal accounts cannot be read by this API; the creator uploads instead.
    if (!["BUSINESS", "MEDIA_CREATOR"].includes(str(me.account_type, 40))) throw new ProviderError("permission");
    const username = str(me.username, 60);
    return { subject, name: username ? `@${username}` : "Instagram", handle: username || null };
  },
  async resources(_, __, identity) {
    return [{ kind: "account", id: identity.subject, name: identity.name, handle: identity.handle ?? null }];
  },
  async listItems(config, token, _resource, cursor): Promise<ItemPage> {
    const page = await providerJson<{ data?: Record<string, unknown>[]; paging?: { cursors?: { after?: unknown }; next?: unknown } }>(
      `${graph(config)}/me/media?fields=id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp&limit=24${cursor ? `&after=${encodeURIComponent(cursor)}` : ""}`,
      { token },
    );
    const items: SourceItem[] = (page.data ?? []).flatMap((m) => {
      const id = providerId(m.id);
      const permalink = safeUrl(m.permalink, /^(www\.)?instagram\.com$/);
      if (!id || !permalink) return [];
      const type = str(m.media_type, 30);
      return [{
        id,
        mediaKind: type === "VIDEO" ? ("video" as const) : type === "CAROUSEL_ALBUM" ? ("carousel" as const) : ("image" as const),
        title: "",
        caption: str(m.caption, 2000),
        permalink,
        // Signed CDN links expire: shown while reviewing, never stored as the post's media.
        thumbnailUrl: safeUrl(type === "VIDEO" ? m.thumbnail_url : m.media_url, IG_HOSTS),
        publishedAt: str(m.timestamp, 40) || null,
        displayable: true,
      }];
    });
    const next = page.paging?.next ? str(page.paging?.cursors?.after, 300) || null : null;
    return { items, next, units: 1 };
  },
  // Instagram Login offers no token revocation endpoint: the person removes Sawwiq
  // under Instagram → Settings → Apps and websites (the UI says so).
};
