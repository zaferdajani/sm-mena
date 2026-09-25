import { afterEach, describe, expect, it } from "vitest";
import { open, seal, tryOpen } from "@/lib/auth/secret-box";

const original = process.env.MFA_ENCRYPTION_KEY;
afterEach(() => {
  process.env.MFA_ENCRYPTION_KEY = original;
});

describe("sealed secrets across a key change", () => {
  it("reads values sealed with the current key and returns null (not a crash) for an earlier key", () => {
    process.env.MFA_ENCRYPTION_KEY = "old-key-that-lived-on-fly-0123456789";
    const sealed = seal("client-link-token");
    expect(tryOpen(sealed)).toBe("client-link-token");
    process.env.MFA_ENCRYPTION_KEY = "new-key-on-vercel-9876543210abcdef";
    expect(() => open(sealed)).toThrow();
    expect(tryOpen(sealed)).toBeNull();
    expect(tryOpen(null)).toBeNull();
    expect(tryOpen("garbage")).toBeNull();
  });
});
