import { describe, expect, it } from "vitest";
import { signInAnywhere } from "@/mobile/src/api/accounts";
import { ApiFailure } from "@/mobile/src/api/client";
import type { Login } from "@/mobile/src/api/contract";

// One app, two sites (docs/64): the real site first; the staging site only when the real site does not know the
// account (or does not serve the app yet); a real person is never sent to the test site because of a problem.

const ok = (id: string): Login => ({ token: `t-${id}`, expiresAt: new Date(Date.now() + 86_400_000).toISOString(), user: { id, role: "agency", mfaEnabled: false } as Login["user"] });
const wrong = () => new ApiFailure(401, { code: "unauthenticated", reason: "invalidCredentials" });
const off = () => new ApiFailure(404, { code: "not_found" });
type Answer = Login | Error;
function sites(production: Answer, staging: Answer) {
  const calls: string[] = [];
  const site = (name: string, answer: Answer) => ({
    auth: {
      async login() {
        calls.push(name);
        if (answer instanceof Error) throw answer;
        return answer;
      },
    },
  });
  return { calls, clients: { production: site("production", production), staging: site("staging", staging) } };
}

describe("signing in on the right site", () => {
  it("uses the real site when it knows the account, without asking the test site", async () => {
    const s = sites(ok("real"), ok("test"));
    const r = await signInAnywhere(s.clients, "a@b.c", "pw-12345678");
    expect(r.site).toBe("production");
    expect(r.login.user.id).toBe("real");
    expect(s.calls).toEqual(["production"]);
  });

  it("moves to the test site only when the real site says wrong email or password", async () => {
    const s = sites(wrong(), ok("test"));
    const r = await signInAnywhere(s.clients, "a@b.c", "pw-12345678");
    expect(r.site).toBe("staging");
    expect(s.calls).toEqual(["production", "staging"]);
  });

  it("uses the test site while the real site does not serve the app yet (404)", async () => {
    const s = sites(off(), ok("test"));
    expect((await signInAnywhere(s.clients, "a@b.c", "pw-12345678")).site).toBe("staging");
  });

  it.each([
    ["offline", new TypeError("Network request failed")],
    ["a server error", new ApiFailure(500, { code: "internal" })],
    ["too many tries", new ApiFailure(429, { code: "rate_limited", retryAfter: 900 })],
    ["a staff account", new ApiFailure(403, { code: "forbidden", reason: "staff" })],
    ["two-step sign-in", new ApiFailure(401, { code: "mfa_required", reason: "mfa" })],
  ])("never tries the test site when the real site has %s", async (_label, failure) => {
    const s = sites(failure, ok("test"));
    await expect(signInAnywhere(s.clients, "a@b.c", "pw-12345678")).rejects.toBe(failure);
    expect(s.calls).toEqual(["production"]);
  });

  it("answers the real site's wrong email or password when the test site does not know it either", async () => {
    const real = wrong();
    const s = sites(real, wrong());
    await expect(signInAnywhere(s.clients, "a@b.c", "pw-12345678")).rejects.toBe(real);
  });

  it("keeps the real site's answer when the test site cannot be reached", async () => {
    const real = wrong();
    const s = sites(real, new TypeError("Network request failed"));
    await expect(signInAnywhere(s.clients, "a@b.c", "pw-12345678")).rejects.toBe(real);
  });

  it("shows the test site's own answer about the account (too many tries)", async () => {
    const limited = new ApiFailure(429, { code: "rate_limited", retryAfter: 600 });
    const s = sites(wrong(), limited);
    await expect(signInAnywhere(s.clients, "a@b.c", "pw-12345678")).rejects.toBe(limited);
  });

  it("while the real site is off, the test site's answer stands", async () => {
    const testSaid = wrong();
    const s = sites(off(), testSaid);
    await expect(signInAnywhere(s.clients, "a@b.c", "pw-12345678")).rejects.toBe(testSaid);
  });
});
