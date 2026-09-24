import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// AES-256-GCM for small secrets at rest (TOTP seeds). Key: MFA_ENCRYPTION_KEY
// (any long random string; `openssl rand -base64 32`). Development falls back
// to a fixed key so local setup needs nothing; production refuses without one.
const DEV_KEY = "sawwiq-development-only-mfa-key";

export function mfaKeyConfigured() {
  return Boolean(process.env.MFA_ENCRYPTION_KEY) || process.env.NODE_ENV !== "production";
}

function key(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY || (process.env.NODE_ENV !== "production" ? DEV_KEY : "");
  if (!raw) throw new Error("MFA_ENCRYPTION_KEY is not set");
  return createHash("sha256").update(raw).digest();
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function open(sealed: string): string {
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !body) throw new Error("bad sealed value");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}
