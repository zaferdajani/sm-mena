import "server-only";
import { SITE_URL } from "@/lib/site";
import { facebook } from "@/lib/social/adapters/facebook";
import { googleIdentity, youtube } from "@/lib/social/adapters/google";
import { instagram } from "@/lib/social/adapters/instagram";
import { tiktok } from "@/lib/social/adapters/tiktok";
import { socialKeyConfigured } from "@/lib/social/crypto";
import type { AdapterConfig, SocialAdapter, SocialProviderId } from "@/lib/social/types";
export { SOCIAL_PROVIDERS, isSocialProvider, type SocialProviderId } from "@/lib/social/types";

// Which platform connections can actually be used (docs/53). A provider offers
// a working Connect action only when all of these hold:
//   1. its code is implemented (every adapter below);
//   2. the owner registered a developer app and stored its credentials in the
//      deployment settings (the env names below; never pasted into a form);
//   3. SOCIAL_TOKEN_KEY encrypts tokens (production has no fallback);
//   4. the owner lists it in SOCIAL_PROVIDERS_APPROVED after the platform
//      approved the permissions and a controlled live test succeeded.
// Credentials alone never switch a provider on (step 4 is a separate gate).
export const ADAPTERS: Record<SocialProviderId, SocialAdapter> = { google: googleIdentity, youtube, instagram, facebook, tiktok };

/** Environment names per provider (values live only in the deployment's secret settings). */
export const PROVIDER_ENV: Record<SocialProviderId, { id: string; secret: string; version?: string }> = {
  google: { id: "GOOGLE_OAUTH_CLIENT_ID", secret: "GOOGLE_OAUTH_CLIENT_SECRET" },
  youtube: { id: "GOOGLE_OAUTH_CLIENT_ID", secret: "GOOGLE_OAUTH_CLIENT_SECRET" },
  instagram: { id: "INSTAGRAM_APP_ID", secret: "INSTAGRAM_APP_SECRET", version: "META_GRAPH_VERSION" },
  facebook: { id: "FACEBOOK_APP_ID", secret: "FACEBOOK_APP_SECRET", version: "META_GRAPH_VERSION" },
  tiktok: { id: "TIKTOK_CLIENT_KEY", secret: "TIKTOK_CLIENT_SECRET" },
};

export type Readiness =
  | { state: "ready" }
  | { state: "unavailable"; blocker: "no_app" | "no_version" | "no_key" | "not_approved" };

const approved = () => new Set((process.env.SOCIAL_PROVIDERS_APPROVED ?? "").split(",").map((s) => s.trim()).filter(Boolean));

/** Exact callback registered in the provider's console: from the configured site URL, never from a request's Host. */
export const callbackUrl = (provider: SocialProviderId) => `${SITE_URL}/api/social/callback/${provider}`;

export function readiness(provider: SocialProviderId): Readiness {
  const env = PROVIDER_ENV[provider];
  if (!process.env[env.id] || !process.env[env.secret]) return { state: "unavailable", blocker: "no_app" };
  if (env.version && !/^v\d+\.\d+$/.test(process.env[env.version] ?? "")) return { state: "unavailable", blocker: "no_version" };
  if (!socialKeyConfigured()) return { state: "unavailable", blocker: "no_key" };
  if (!approved().has(provider)) return { state: "unavailable", blocker: "not_approved" };
  return { state: "ready" };
}

/** App credentials for server-side calls, or null when the provider is not usable. */
export function adapterConfig(provider: SocialProviderId, { requireReady = true } = {}): AdapterConfig | null {
  if (requireReady && readiness(provider).state !== "ready") return null;
  const env = PROVIDER_ENV[provider];
  const clientId = process.env[env.id];
  const clientSecret = process.env[env.secret];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri: callbackUrl(provider), graphVersion: env.version ? process.env[env.version] : undefined };
}
