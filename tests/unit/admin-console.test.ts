import "./setup-db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminAccess } from "@/lib/auth/policy";
import { adminMfaRequired, adminResetMfa, confirmEnrollment, mfaStatus, startEnrollment, verifySecondFactor } from "@/lib/auth/mfa";
import { open, seal } from "@/lib/auth/secret-box";
import { currentStep, totp, totpAt } from "@/lib/auth/totp";
import { createAgency } from "@/lib/data/agencies";
import { bugCounts, errorFingerprint, listErrors, listSupportRequests, recordError, setErrorStatus, submitSupportRequest } from "@/lib/data/bugs";
import { applyProviderEvent, getPayment, markPaymentPaid, paymentSummary, paymentsCsv, planPriceFils, recordManualPayment, refundPayment, startPlanCheckout, listPayments } from "@/lib/data/payments";
import { deviceOf, marketplaceStats, recordPageView, sourceOf, trafficStats } from "@/lib/data/stats";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { agencies, users } from "@/lib/db/schema";
import { paymentProvider, signWebhook } from "@/lib/payments/provider";

let adminId: string;
let agency: { id: string };
let ownerId: string;
beforeAll(async () => {
  adminId = (await createUser("root@t.jo", "password-1234", "admin")).id;
  ownerId = (await createUser("owner@t.jo", "password-1234")).id;
  agency = await createAgency(ownerId, { handle: "pay.me", name: "Pay Me", city: "amman", services: ["ads_meta"] });
});
afterAll(() => closeDb());

describe("two-factor sign-in", () => {
  it("encrypts secrets at rest and detects tampering", () => {
    const sealed = seal("JBSWY3DPEHPK3PXP");
    expect(sealed).not.toContain("JBSWY3DPEHPK3PXP");
    expect(open(sealed)).toBe("JBSWY3DPEHPK3PXP");
    const parts = sealed.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => open(parts.join("."))).toThrow();
  });

  it("enrols with a code, then accepts each code once and each backup code once", async () => {
    const { secret, qrSvg } = await startEnrollment(ownerId, "owner@t.jo");
    expect(qrSvg).toContain("<svg");
    const db = await getDb();
    const [row] = await db.select().from(users).where(eq(users.id, ownerId));
    expect(row.totpPendingEnc).not.toContain(secret); // stored encrypted

    expect(await confirmEnrollment(ownerId, "000000")).toEqual({ error: "badCode" });
    // Use the previous step's code so the current one is still fresh for sign-in below.
    const enrolled = await confirmEnrollment(ownerId, totpAt(secret, currentStep() - 1));
    if (!("backupCodes" in enrolled)) throw new Error("not enrolled");
    expect(enrolled.backupCodes).toHaveLength(10);
    expect((await mfaStatus(ownerId)).enabled).toBe(true);

    const code = totp(secret);
    expect(await verifySecondFactor(ownerId, code)).toBe("totp");
    expect(await verifySecondFactor(ownerId, code)).toBeNull(); // replay
    expect(await verifySecondFactor(ownerId, enrolled.backupCodes[0])).toBe("backup");
    expect(await verifySecondFactor(ownerId, enrolled.backupCodes[0])).toBeNull(); // used up
    expect((await mfaStatus(ownerId)).backupCodesLeft).toBe(9);

    await adminResetMfa(adminId, ownerId);
    expect((await mfaStatus(ownerId)).enabled).toBe(false);
  });

  it("requires admins to have 2FA in production, enforced on the server", () => {
    const admin = { role: "admin", mfaEnabled: false };
    expect(adminAccess(null, true)).toBe("login");
    expect(adminAccess({ role: "agency", mfaEnabled: true }, true)).toBe("forbidden");
    expect(adminAccess(admin, true)).toBe("enroll");
    expect(adminAccess({ ...admin, mfaEnabled: true }, true)).toBe("ok");
    expect(adminAccess(admin, false)).toBe("ok");

    const env = { ...process.env };
    try {
      delete process.env.ADMIN_REQUIRE_2FA;
      expect(adminMfaRequired()).toBe(false); // development default
      process.env.ADMIN_REQUIRE_2FA = "true";
      expect(adminMfaRequired()).toBe(true);
      process.env.ADMIN_REQUIRE_2FA = "false";
      expect(adminMfaRequired()).toBe(false);
    } finally {
      process.env = env;
    }
  });
});

describe("bug journal and user reports", () => {
  it("groups repeats, ignores numbers in messages, and reopens fixed errors that come back", async () => {
    const base = { source: "client" as const, kind: "js_error", path: "/ar/a/nakhla.studio?x=1" };
    expect(errorFingerprint({ ...base, message: "Cannot read x of item 12" })).toBe(errorFingerprint({ ...base, message: "Cannot read x of item 99", path: "/ar/a/other.agency" }));
    await recordError({ ...base, message: "Cannot read x of item 12", stack: "at f()" });
    await recordError({ ...base, message: "Cannot read x of item 13" });
    let [row] = await listErrors("unresolved");
    expect(row.occurrences).toBe(2);
    expect(row.path).toBe("/ar/a/:x");

    await setErrorStatus(row.id, adminId, { status: "fixed", notes: "null check", commit: "abc123" });
    expect(await listErrors("unresolved")).toHaveLength(0);
    await recordError({ ...base, message: "Cannot read x of item 14" });
    [row] = await listErrors("unresolved");
    expect(row).toMatchObject({ status: "open", occurrences: 3 });
  });

  it("stores user reports without query strings and counts new ones", async () => {
    await submitSupportRequest({ kind: "bug", message: "The chat button does nothing", path: "/en/match?token=secret", locale: "en" });
    const [r] = await listSupportRequests("new");
    expect(r.path).toBe("/en/match");
    expect((await bugCounts()).newReports).toBe(1);
  });
});

describe("payments", () => {
  it("activates a plan from a verified, de-duplicated provider event", async () => {
    const { payment, redirectPath } = await startPlanCheckout(agency.id, "pro", 3, ownerId);
    expect(redirectPath).toBe(`/pay/${payment.id}`);
    expect(payment.amountFils).toBe(planPriceFils("pro", 3));

    const event = { id: "evt_1", type: "payment.succeeded" as const, paymentRef: payment.id, providerRef: "mock_x", amountFils: payment.amountFils };
    // Webhook signature check
    const body = JSON.stringify(event);
    expect(paymentProvider().parseWebhook(body, new Headers({ "x-sawwiq-signature": signWebhook(body) }))).toEqual(event);
    expect(paymentProvider().parseWebhook(body, new Headers({ "x-sawwiq-signature": "0".repeat(64) }))).toBeNull();

    expect(await applyProviderEvent("mock", { ...event, id: "evt_bad", amountFils: 1 })).toBe("amount_mismatch");
    expect(await applyProviderEvent("mock", event)).toBe("ok");
    expect(await applyProviderEvent("mock", event)).toBe("duplicate");
    const paid = await getPayment(payment.id);
    expect(paid?.status).toBe("paid");
    const db = await getDb();
    const [a] = await db.select().from(agencies).where(eq(agencies.id, agency.id));
    expect(a.plan).toBe("pro");
    expect(Math.round((a.planExpiresAt!.getTime() - Date.now()) / 86_400_000)).toBe(90);

    // Renewing the same plan stacks on the remaining time; paying twice changes nothing.
    await markPaymentPaid(payment.id);
    const renewal = await recordManualPayment({ agencyId: agency.id, plan: "pro", months: 1, method: "cliq", amountJod: 19, reference: "CLIQ-1" }, adminId);
    expect(Math.round((renewal!.periodEnd!.getTime() - Date.now()) / 86_400_000)).toBe(120);
  });

  it("summarises revenue, refunds and exports CSV", async () => {
    const summary = await paymentSummary();
    expect(summary.thisMonth).toBe(planPriceFils("pro", 3) + 19_000);
    expect(summary.mrr).toBe(19_000);
    expect(summary.paidAgencies).toBe(1);

    const [latest] = await listPayments("paid", agency.id);
    await refundPayment(latest.id, adminId, "duplicate transfer", true);
    expect((await paymentSummary()).paidAgencies).toBe(0);
    const csv = paymentsCsv(await listPayments("all"));
    expect(csv.split("\n")[0]).toContain("amountJod");
    expect(csv).toContain("refunded");
    expect(csv).toContain("57.000");
  });
});

describe("statistics", () => {
  it("classifies sources and devices", () => {
    expect(sourceOf("Instagram_Bio", "https://google.com", "sawwiq.jo")).toBe("instagram_bio");
    expect(sourceOf(null, "https://www.google.jo/search?q=x", "sawwiq.jo")).toBe("google");
    expect(sourceOf(null, "https://l.facebook.com/l.php", "sawwiq.jo")).toBe("facebook");
    expect(sourceOf(null, "https://sawwiq.jo/ar", "sawwiq.jo")).toBe("(direct)");
    expect(sourceOf(null, null, "sawwiq.jo")).toBe("(direct)");
    expect(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile")).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe("tablet");
    expect(deviceOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
  });

  it("counts visitors, visits, landings and the funnel", async () => {
    const view = (sessionId: string, path: string, landing: boolean, referrer: string | null = null) =>
      recordPageView({ path, landing, sessionId, referrer, visitorId: `v-${sessionId}`, userAgent: "iPhone Mobile", ownHost: "sawwiq.jo", locale: "ar", timezone: "Asia/Amman" });
    await view("s1", "/", true, "https://www.instagram.com/");
    await view("s1", "/a/pay.me", false);
    await view("s2", "/hire/ads_meta", true, "https://google.com/");
    const t = await trafficStats(7);
    expect(t.totals).toEqual({ views: 3, visitors: 2, sessions: 2 });
    expect(t.series).toHaveLength(7);
    expect(t.series.at(-1)?.views).toBe(3);
    expect(t.sources.map((s) => s.key).sort()).toEqual(["google", "instagram"]);
    expect(t.landings.find((l) => l.source === "google")?.path).toBe("/hire/ads_meta");
    expect(t.devices).toEqual([{ key: "mobile", n: 2 }]);
    const m = await marketplaceStats(7);
    expect(m.funnel[0]).toEqual({ key: "browsed", n: 2 });
  });
});
