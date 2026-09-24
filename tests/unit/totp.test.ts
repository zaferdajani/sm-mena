import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, generateBackupCodes, hashBackupCode, otpauthUri, totp, totpAt, verifyTotp } from "@/lib/auth/totp";

// RFC 6238 appendix B secret ("12345678901234567890"), SHA-1, truncated to 6 digits.
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("TOTP (RFC 6238)", () => {
  it("matches the RFC test vectors", () => {
    expect(RFC_SECRET).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(totpAt(RFC_SECRET, Math.floor(59 / 30))).toBe("287082");
    expect(totpAt(RFC_SECRET, Math.floor(1111111109 / 30))).toBe("081804");
    expect(totpAt(RFC_SECRET, Math.floor(1234567890 / 30))).toBe("005924");
    expect(totpAt(RFC_SECRET, Math.floor(2000000000 / 30))).toBe("279037");
  });

  it("round-trips base32", () => {
    const buf = Buffer.from([0, 1, 2, 250, 255, 17, 99]);
    expect(base32Decode(base32Encode(buf))).toEqual(buf);
    expect(() => base32Decode("not*base32")).toThrow();
  });

  it("accepts ±1 step for clock drift, rejects older codes and replays", () => {
    const now = 1_800_000_000_000;
    const step = Math.floor(now / 30_000);
    expect(verifyTotp(RFC_SECRET, totp(RFC_SECRET, now), 0, now)).toBe(step);
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step - 1), 0, now)).toBe(step - 1);
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step + 1), 0, now)).toBe(step + 1);
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step - 2), 0, now)).toBeNull();
    // Already used this step: the same code can't sign in twice.
    expect(verifyTotp(RFC_SECRET, totp(RFC_SECRET, now), step, now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, "12345", 0, now)).toBeNull();
    expect(verifyTotp(RFC_SECRET, "abcdef", 0, now)).toBeNull();
  });

  it("makes authenticator URIs and single-use backup codes", () => {
    expect(otpauthUri("ABC", "a@b.jo")).toBe("otpauth://totp/Sawwiq%3Aa%40b.jo?secret=ABC&issuer=Sawwiq&algorithm=SHA1&digits=6&period=30");
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    expect(codes.every((c) => /^[a-z2-9]{4}-[a-z2-9]{4}$/.test(c))).toBe(true);
    expect(hashBackupCode(codes[0].toUpperCase().replace("-", " "))).toBe(hashBackupCode(codes[0]));
  });
});
