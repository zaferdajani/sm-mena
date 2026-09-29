import "server-only";
import { ProviderError, providerId, providerJson, safeUrl, str } from "@/lib/social/http";
import type { AdapterConfig, ItemPage, SocialAdapter, SourceItem, TokenSet } from "@/lib/social/types";

// Facebook Login for Pages (docs/53): pages_show_list to list only the Pages
// this person manages, pages_read_engagement to read a chosen Page's posts.
// No friends, personal feed, publishing or messaging permissions.
const SCOPES = ["pages_show_list", "pages_read_engagement"] as const;
const graph = (config: AdapterConfig) => `https://graph.facebook.com/${config.graphVersion}`;
const FB_HOSTS = /(^|\.)(fbcdn\.net|facebook\.com)$/;

export const facebook: SocialAdapter = {
  id: "facebook",
  scopes: SCOPES,
  requiredScopes: SCOPES,
  pkce: false,
  openid: false,
  imports: true,
  authorizeUrl(config, p) {
    const u = new URL(`https://www.facebook.com/${config.graphVersion}/dialog/oauth`);
    u.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, state: p.state, response_type: "code", scope: SCOPES.join(",") }).toString();
    return u.toString();
  },
  async exchange(config, code): Promise<TokenSet> {
    const t = await providerJson<Record<string, unknown>>(
      `${graph(config)}/oauth/access_token?${new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, client_secret: config.clientSecret, code })}`,
    );
    const accessToken = str(t.access_token, 4000);
    if (!accessToken) throw new ProviderError("invalid");
    // What was actually granted (a person can untick permissions on the dialog).
    const perms = await providerJson<{ data?: { permission?: unknown; status?: unknown }[] }>(`${graph(config)}/me/permissions`, { token: accessToken });
    const scopes = (perms.data ?? []).filter((p) => p.status === "granted").map((p) => str(p.permission, 80)).filter(Boolean);
    return { accessToken, expiresIn: typeof t.expires_in === "number" ? t.expires_in : null, scopes };
  },
  async identify(config, tokens) {
    const me = await providerJson<Record<string, unknown>>(`${graph(config)}/me?fields=id,name`, { token: tokens.accessToken });
    const subject = providerId(me.id);
    if (!subject) throw new ProviderError("invalid");
    return { subject, name: str(me.name, 120) || "Facebook" };
  },
  async resources(config, tokens) {
    const pages = await providerJson<{ data?: Record<string, unknown>[] }>(`${graph(config)}/me/accounts?fields=id,name,access_token&limit=50`, { token: tokens.accessToken });
    return (pages.data ?? []).flatMap((p) => {
      const id = providerId(p.id);
      const token = str(p.access_token, 4000);
      return id && token ? [{ kind: "page" as const, id, name: str(p.name, 120) || id, token }] : [];
    });
  },
  async listItems(config, token, resource, cursor): Promise<ItemPage> {
    const page = await providerJson<{ data?: Record<string, unknown>[]; paging?: { cursors?: { after?: unknown }; next?: unknown } }>(
      `${graph(config)}/${encodeURIComponent(resource.id)}/posts?fields=id,message,permalink_url,created_time,full_picture&limit=24${cursor ? `&after=${encodeURIComponent(cursor)}` : ""}`,
      { token },
    );
    const items: SourceItem[] = (page.data ?? []).flatMap((p) => {
      const id = str(p.id, 128);
      const permalink = safeUrl(p.permalink_url, /^(www\.)?facebook\.com$/);
      if (!id || !/^[0-9_]+$/.test(id) || !permalink) return [];
      return [{ id, mediaKind: "post" as const, title: "", caption: str(p.message, 2000), permalink, thumbnailUrl: safeUrl(p.full_picture, FB_HOSTS), publishedAt: str(p.created_time, 40) || null, displayable: true }];
    });
    const next = page.paging?.next ? str(page.paging?.cursors?.after, 300) || null : null;
    return { items, next, units: 1 };
  },
  async revoke(config, token) {
    const r = await providerJson<{ success?: unknown }>(`${graph(config)}/me/permissions`, { method: "DELETE", token });
    return r.success === true;
  },
};
