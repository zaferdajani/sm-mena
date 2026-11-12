import { afterEach, describe, expect, it, vi } from "vitest";
import { COUNTRIES } from "@/lib/countries";
import { FEATURES, applyStagingFeatures, defaultFeatures, resetFeatureCache } from "@/lib/features";
import { launchPhase } from "@/lib/launch-phase";
import { assertStagingDatabase, isProductionDeployment, isStagingMode, requestHost, stagingHostMisconfigured, virtualPaymentsAllowed } from "@/lib/core/rules/staging";
import { evaluateTestCard, TEST_CARDS } from "@/lib/payments/virtual-cards";
import { locales } from "@/i18n/routing";
import { LANGUAGES } from "@/i18n/languages";

afterEach(() => {
  vi.unstubAllEnvs();
  resetFeatureCache();
});

const future = { number: TEST_CARDS.success, expiry: "12/30", cvc: "123", name: "Staging Client" };

describe("staging gate", () => {
  it("stays closed unless staging is explicit and the host is not production", () => {
    expect(isStagingMode({})).toBe(false);
    expect(isStagingMode({ STAGING_MODE: "true" })).toBe(true);
    expect(isStagingMode({ STAGING_MODE: "true", VERCEL_ENV: "production" })).toBe(false);
    expect(isStagingMode({ STAGING_MODE: "true", NEXT_PUBLIC_SITE_URL: "https://sawwiq.org" })).toBe(false);
    expect(isStagingMode({ STAGING_MODE: "true", NEXT_PUBLIC_SITE_URL: "https://sm-mena.vercel.app" })).toBe(false);
    expect(isStagingMode({ STAGING_MODE: "true", VERCEL_ENV: "preview", NEXT_PUBLIC_SITE_URL: "https://sawwiq.org" })).toBe(true);
    expect(isStagingMode({ STAGING_MODE: "true", VERCEL_ENV: "development", NEXT_PUBLIC_SITE_URL: "https://www.sawwiq.org" })).toBe(true);
    expect(isProductionDeployment({ VERCEL_ENV: "preview", NEXT_PUBLIC_SITE_URL: "https://sawwiq.org" })).toBe(false);
    expect(isProductionDeployment({ VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://staging.sawwiq.org" })).toBe(true);
    expect(isProductionDeployment({ NEXT_PUBLIC_SITE_URL: "https://staging.example" })).toBe(false);
  });

  it("refuses staging.sawwiq.org unless the process is isolated staging", () => {
    const isolated = {
      STAGING_MODE: "true",
      VERCEL_ENV: "preview",
      DATABASE_URL: "postgres://u:p@db.klbjfgeoztmvtiolvjbk.supabase.co/postgres",
    };
    expect(requestHost("Staging.Sawwiq.org:443, proxy.example")).toBe("staging.sawwiq.org");
    expect(stagingHostMisconfigured("staging.sawwiq.org", isolated)).toBe(false);
    expect(stagingHostMisconfigured("www.test.sawwiq.org:443", isolated)).toBe(false);
    expect(stagingHostMisconfigured("sawwiq.org", isolated)).toBe(false);
    expect(stagingHostMisconfigured("staging.sawwiq.org", {})).toBe(true);
    expect(stagingHostMisconfigured("test.sawwiq.org", { STAGING_MODE: "true", VERCEL_ENV: "production", DATABASE_URL: isolated.DATABASE_URL })).toBe(true);
    expect(stagingHostMisconfigured("www.staging.sawwiq.org", { ...isolated, DATABASE_URL: "postgres://u:p@db.dzedhnmxywtteeduwpby.supabase.co/postgres" })).toBe(true);
  });

  it("refuses to start when staging points at the live database", () => {
    expect(() => assertStagingDatabase({ STAGING_MODE: "true", DATABASE_URL: "postgres://u:p@db.dzedhnmxywtteeduwpby.supabase.co/postgres" })).toThrow(/production/);
    expect(() => assertStagingDatabase({ DATABASE_URL: "postgres://u:p@db.dzedhnmxywtteeduwpby.supabase.co/postgres" })).not.toThrow();
    expect(() => assertStagingDatabase({ STAGING_MODE: "true", DATABASE_URL: "postgres://u:p@db.klbjfgeoztmvtiolvjbk.supabase.co/postgres" })).not.toThrow();
  });

  it("forces the full launch phase and every feature except the pre-launch teaser", () => {
    const env = { STAGING_MODE: "true", LAUNCH_PHASE: "registration" };
    expect(launchPhase(env)).toBe("full");
    expect(launchPhase({})).toBe("registration");
    expect(launchPhase({ LAUNCH_PHASE: "discovery" })).toBe("discovery");
    vi.stubEnv("STAGING_MODE", "true");
    const features = defaultFeatures();
    for (const f of FEATURES) {
      expect(features[f.key].state).toBe(f.key === "prelaunch_home" ? "off" : "on");
    }
    expect(applyStagingFeatures({ ...features, contracts: { state: "off", pilots: [] } }).contracts.state).toBe("on");
  });

  it("allows the virtual gateway only in sandbox staging, never with live payments", () => {
    expect(virtualPaymentsAllowed({ STAGING_MODE: "true", VIRTUAL_PAYMENTS: "sandbox" })).toBe(true);
    expect(virtualPaymentsAllowed({ STAGING_MODE: "true", VIRTUAL_PAYMENTS: "sandbox", PROTECTED_PAYMENTS_LIVE: "true" })).toBe(false);
    expect(virtualPaymentsAllowed({ STAGING_MODE: "true", VIRTUAL_PAYMENTS: "mock" })).toBe(false);
    expect(virtualPaymentsAllowed({ VIRTUAL_PAYMENTS: "sandbox" })).toBe(false);
    expect(virtualPaymentsAllowed({ STAGING_MODE: "true", VIRTUAL_PAYMENTS: "sandbox", VERCEL_ENV: "production" })).toBe(false);
  });

  it("serves every built-in country and only the locales that have message catalogs", () => {
    expect(COUNTRIES.map((c) => c.code)).toEqual(["jo", "sa", "ae", "kw", "qa", "bh", "om", "eg"]);
    expect(new Set(COUNTRIES.map((c) => c.currency))).toEqual(new Set(["JOD", "SAR", "AED", "KWD", "QAR", "BHD", "OMR", "EGP"]));
    expect(locales).toEqual(["ar", "en"]);
    expect(LANGUAGES.filter((l) => l.enabled).map((l) => l.code)).toEqual(["ar", "en"]);
    expect(LANGUAGES.filter((l) => !l.enabled).length).toBeGreaterThan(0);
  });
});

describe("virtual test cards", () => {
  const now = new Date("2026-10-15T00:00:00Z");
  it("accepts only the success number, and refuses every other 16-digit number", () => {
    expect(evaluateTestCard(future, now)).toBe("success");
    expect(evaluateTestCard({ ...future, number: "4242 4242 4242 4242" }, now)).toBe("success");
    expect(evaluateTestCard({ ...future, number: TEST_CARDS.declined }, now)).toBe("declined");
    expect(evaluateTestCard({ ...future, number: TEST_CARDS.insufficient }, now)).toBe("insufficient");
    expect(evaluateTestCard({ ...future, number: TEST_CARDS.expired, expiry: "12/30" }, now)).toBe("expired");
    expect(evaluateTestCard({ ...future, number: TEST_CARDS.cvc }, now)).toBe("cvc");
    expect(evaluateTestCard({ ...future, number: "4111111111111111" }, now)).toBe("unknown");
    expect(evaluateTestCard({ ...future, expiry: "01/20" }, now)).toBe("expired");
    expect(evaluateTestCard({ ...future, expiry: "13/30" }, now)).toBe("invalid");
    expect(evaluateTestCard({ ...future, cvc: "12" }, now)).toBe("invalid");
    expect(evaluateTestCard({ ...future, name: "A" }, now)).toBe("invalid");
  });
});
