import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

// Time-based one-time passwords (RFC 6238: HMAC-SHA1, 30 s steps, 6 digits),
// compatible with Google Authenticator, Microsoft Authenticator, 1Password and
// Authy. No dependencies, so tests (and the e2e suite) can compute codes too.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const STEP_SECONDS = 30;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error("invalid base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** New 160-bit secret, base32 encoded. */
export const generateSecret = () => base32Encode(randomBytes(20));

export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

export function totpAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

export const totp = (secret: string, now = Date.now()) => totpAt(secret, currentStep(now));

/**
 * Checks a code against the current step ±1 (clock drift). Returns the
 * matching step, or null. Steps at or before `lastUsedStep` are rejected so a
 * code can't be replayed.
 */
export function verifyTotp(secret: string, code: string, lastUsedStep = 0, now = Date.now()): number | null {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const step = currentStep(now);
  for (const s of [step, step - 1, step + 1]) {
    if (s <= lastUsedStep) continue;
    const expected = Buffer.from(totpAt(secret, s));
    if (timingSafeEqual(expected, Buffer.from(clean))) return s;
  }
  return null;
}

export function otpauthUri(secret: string, account: string, issuer = "Sawwiq") {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}

// Backup codes: 10 single-use codes like "k7m2-9xq4", stored as sha256 hashes.
const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = Array.from({ length: 8 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
}
export const normalizeBackupCode = (code: string) => code.toLowerCase().replace(/[^a-z0-9]/g, "");
export const hashBackupCode = (code: string) => createHash("sha256").update(`sawwiq-backup:${normalizeBackupCode(code)}`).digest("hex");
