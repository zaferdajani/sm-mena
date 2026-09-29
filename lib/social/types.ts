// Shared shapes for the platform adapters (docs/53). Everything a provider
// returns is untrusted: adapters keep bounded, validated fields only.
export const SOCIAL_PROVIDERS = ["google", "youtube", "instagram", "facebook", "tiktok"] as const;
export type SocialProviderId = (typeof SOCIAL_PROVIDERS)[number];
export const isSocialProvider = (v: unknown): v is SocialProviderId => (SOCIAL_PROVIDERS as readonly string[]).includes(v as string);

export type TokenSet = {
  accessToken: string;
  refreshToken?: string | null;
  /** Seconds until the access token expires, when the provider says. */
  expiresIn?: number | null;
  refreshExpiresIn?: number | null;
  /** Scopes the person actually granted (may be fewer than requested). */
  scopes: string[];
  idToken?: string | null;
  /** Some providers name the account in the token response. */
  subject?: string | null;
};

export type Identity = { subject: string; name: string; handle?: string | null };

/** A channel, Page or account the grant can read; the creator confirms one before anything is browsed. */
export type ResourceCandidate = { kind: "identity" | "channel" | "page" | "account"; id: string; name: string; handle?: string | null; token?: string | null };

/** A published item offered for review: bounded metadata, the official link, never the media file. */
export type SourceItem = {
  id: string;
  mediaKind: "video" | "image" | "carousel" | "post";
  title: string;
  caption: string;
  permalink: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  /** False when the platform does not allow showing it on another site (private, not embeddable). */
  displayable: boolean;
};

export type ItemPage = { items: SourceItem[]; next: string | null; units: number };

export type AdapterConfig = { clientId: string; clientSecret: string; redirectUri: string; graphVersion?: string };

export interface SocialAdapter {
  id: SocialProviderId;
  /** Least privilege: exactly what this feature reads, nothing to post, message or advertise. */
  scopes: readonly string[];
  /** Without these the connection cannot do its job (a partial grant is shown as limited). */
  requiredScopes: readonly string[];
  /** Whether the provider supports PKCE S256 for this web flow (never sent otherwise). */
  pkce: boolean;
  /** Google identity: an OpenID ID token is verified (issuer, audience, signature, expiry, nonce). */
  openid: boolean;
  /** What this connection is for: content import, or identity linking only. */
  imports: boolean;
  authorizeUrl(config: AdapterConfig, p: { state: string; challenge?: string; nonce?: string }): string;
  exchange(config: AdapterConfig, code: string, verifier?: string): Promise<TokenSet>;
  identify(config: AdapterConfig, tokens: TokenSet, nonce?: string): Promise<Identity>;
  resources(config: AdapterConfig, tokens: TokenSet, identity: Identity): Promise<ResourceCandidate[]>;
  listItems?(config: AdapterConfig, token: string, resource: { kind: string; id: string }, cursor: string | null): Promise<ItemPage>;
  refresh?(config: AdapterConfig, refreshToken: string, accessToken: string): Promise<TokenSet>;
  /** True when the platform confirmed the grant was withdrawn. */
  revoke?(config: AdapterConfig, token: string): Promise<boolean>;
}
