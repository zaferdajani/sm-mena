import "./setup-db";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { closeDb } from "@/lib/db";
import { maskEmail, sendSignerCode, signerEmail, verifySigner } from "@/lib/auth/signer-check";

afterAll(() => closeDb());
afterEach(() => vi.unstubAllEnvs());

// QA H-01: whoever opens a private agreement link proves an email with a one-time code before signing.
describe("signer check", () => {
  it("sends the code to the agreement's email when it has one, otherwise to the typed address", () => {
    expect(signerEmail("Client@Example.test", "someone@else.test")).toEqual({ email: "client@example.test" });
    expect(signerEmail(null, " Signer@Example.test ")).toEqual({ email: "signer@example.test" });
    expect(signerEmail(null, "not-an-email")).toEqual({ error: "email" });
    expect(signerEmail(undefined, null)).toEqual({ error: "email" });
  });

  it("masks the address shown on the page", () => {
    expect(maskEmail("nour@example.test")).toBe("n•••@example.test");
    expect(maskEmail("ab@x.test")).toBe("a•••@x.test");
    expect(maskEmail("broken")).toBe("•••");
  });

  it("accepts the right code once, and refuses a wrong or reused one", async () => {
    vi.stubEnv("AUTH_SHOW_CODES", "true");
    vi.stubEnv("RESEND_API_KEY", "");
    const sent = await sendSignerCode("signer.check@example.test");
    expect(sent).toMatchObject({ ok: true });
    const code = "shownCode" in sent ? sent.shownCode! : "";
    expect(code).toMatch(/^\d{6}$/);
    expect(await verifySigner("signer.check@example.test", "12345")).toEqual({ error: "verify" });
    const wrong = code === "000000" ? "111111" : "000000";
    expect(await verifySigner("signer.check@example.test", wrong)).toEqual({ error: "badCode" });
    expect(await verifySigner("other@example.test", code)).toEqual({ error: "expired" });
    expect(await verifySigner("signer.check@example.test", code)).toEqual({ ok: true });
    expect(await verifySigner("signer.check@example.test", code)).toEqual({ error: "expired" });
  });
});
