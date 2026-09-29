import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Platform tokens at rest (docs/53): AES-256-GCM with a dedicated key,
// SOCIAL_TOKEN_KEY (32 random bytes, base64: `openssl rand -base64 32`), never
// the two-factor key. The associated data binds a sealed value to its grant,
// provider and agency, so a token copied into another row does not open.
// Development and tests use a fixed key; production has no fallback, and
// without the key no provider can be authorized (lib/social/providers.ts).
export const SOCIAL_KEY_VERSION = 1;
const DEV_KEY = "sawwiq-development-only-social-token-key";

export function socialKeyConfigured(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return decodeKey(process.env.SOCIAL_TOKEN_KEY) !== null;
}

function decodeKey(raw: string | undefined): Buffer | null {
  if (!raw) return null;
  const buf = Buffer.from(raw, "base64");
  return buf.length === 32 ? buf : null;
}

function key(): Buffer {
  const configured = decodeKey(process.env.SOCIAL_TOKEN_KEY);
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("SOCIAL_TOKEN_KEY is not set (32 bytes, base64)");
  return createHash("sha256").update(DEV_KEY).digest();
}

/** What a sealed value belongs to; the same context is needed to open it. */
export type SealContext = { purpose: "access" | "refresh" | "page" | "verifier" | "nonce"; owner: string; provider: string; agencyId: string };
const aad = (c: SealContext) => Buffer.from(`sawwiq-social|${c.purpose}|${c.owner}|${c.provider}|${c.agencyId}`);

export function sealToken(plain: string, context: SealContext): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(aad(context));
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [`s${SOCIAL_KEY_VERSION}`, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

/** The plain value, or null when it was sealed for another context or key. */
export function openToken(sealed: string | null | undefined, context: SealContext): string | null {
  if (!sealed) return null;
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== `s${SOCIAL_KEY_VERSION}` || !iv || !tag || !body) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAAD(aad(context));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** A random URL-safe value (state, PKCE verifier, nonce). */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
/** PKCE S256 challenge for a verifier (RFC 7636). */
export const pkceChallenge = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");
