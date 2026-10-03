import { describe, expect, it } from "vitest";
import { joinSchema, loginSchema } from "@/lib/validation/auth";
import { setupBehanceSchema, setupClientSchema, setupProfileSchema, setupProjectSchema, setupSourceSchema, setupVersionSchema } from "@/lib/validation/portfolio-setup";
import { packageSchema, studioProfileSchema } from "@/lib/validation/studio";

// The lifted input contracts (docs/architecture/mobile-and-api-roadmap.md §3 step 3): the web actions and the
// bearer API parse with the same schemas, so these fixtures pin the rules a native client will meet.

describe("auth contracts", () => {
  it("accepts a sign-in and trims the e-mail", () => {
    expect(loginSchema.parse({ email: "  Owner@Example.com ", password: "x" })).toEqual({ email: "Owner@Example.com", password: "x" });
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
  it("requires consent, a real city and an 8-character password to join", () => {
    const ok = { name: "Studio", handle: "Studio", city: "amman", whatsapp: "+962790000000", email: "a@b.co", password: "longenough", consent: "on" };
    expect(joinSchema.parse(ok).handle).toBe("studio");
    expect(joinSchema.safeParse({ ...ok, consent: "" }).success).toBe(false);
    expect(joinSchema.safeParse({ ...ok, city: "atlantis" }).success).toBe(false);
    expect(joinSchema.safeParse({ ...ok, password: "short" }).success).toBe(false);
    expect(joinSchema.safeParse({ ...ok, whatsapp: "12" }).success).toBe(false);
  });
});

describe("portfolio setup contracts", () => {
  it("coerces the draft version from a form string and rejects negatives", () => {
    expect(setupVersionSchema.parse("3")).toBe(3);
    expect(setupVersionSchema.safeParse("-1").success).toBe(false);
    expect(setupVersionSchema.safeParse("1.5").success).toBe(false);
  });
  it("knows the four sources", () => {
    expect(setupSourceSchema.options).toEqual(["upload", "pdf", "behance", "social"]);
    expect(setupSourceSchema.safeParse("dropbox").success).toBe(false);
  });
  it("profile step: a name of at least two characters and an introduction of at most 500", () => {
    expect(setupProfileSchema.parse({ version: "0", name: "  Ab ", bio: "" })).toEqual({ version: 0, name: "Ab", bio: "" });
    expect(setupProfileSchema.safeParse({ version: 0, name: "A", bio: "" }).success).toBe(false);
    expect(setupProfileSchema.safeParse({ version: 0, name: "Studio", bio: "x".repeat(501) }).success).toBe(false);
  });
  it("client step: an existing client needs an id, a new one a name", () => {
    expect(setupClientSchema.safeParse({ version: 1, mode: "existing", clientId: "8d3f1b2e-6c7a-4f0e-9a1b-2c3d4e5f6a7b" }).success).toBe(true);
    expect(setupClientSchema.safeParse({ version: 1, mode: "existing", clientId: "nope" }).success).toBe(false);
    expect(setupClientSchema.safeParse({ version: 1, mode: "sponsor" }).success).toBe(false);
  });
  it("project step: one to six services and bounded text", () => {
    const ok = { version: 2, title: "Launch", contribution: "Strategy and content", services: ["smm_management"] };
    expect(setupProjectSchema.safeParse(ok).success).toBe(true);
    expect(setupProjectSchema.safeParse({ ...ok, services: [] }).success).toBe(false);
    expect(setupProjectSchema.safeParse({ ...ok, services: Array(7).fill("x") }).success).toBe(false);
    expect(setupProjectSchema.safeParse({ ...ok, title: "L" }).success).toBe(false);
  });
  it("behance import: only https project pages and image urls, at most the post limit", () => {
    const ok = { projectUrl: "https://www.behance.net/gallery/1/x", images: ["https://mir-s3-cdn-cf.behance.net/a.jpg"], title: "t", caption: "c", client: null };
    expect(setupBehanceSchema.safeParse(ok).success).toBe(true);
    expect(setupBehanceSchema.safeParse({ ...ok, images: [] }).success).toBe(false);
    expect(setupBehanceSchema.safeParse({ ...ok, images: Array(11).fill("https://x.test/a.jpg") }).success).toBe(false);
    expect(setupBehanceSchema.safeParse({ ...ok, projectUrl: "behance.net/gallery" }).success).toBe(false);
  });
});

describe("studio contracts", () => {
  const profile = { name: "Studio", handle: "Studio", city: "amman", startingPriceJod: "", whatsapp: "", phone: "", email: "", website: "", instagram: "", foundedYear: "", teamSize: "" };
  it("profile: empty optional fields stay empty strings, numbers are coerced", () => {
    const parsed = studioProfileSchema.parse({ ...profile, startingPriceJod: "250", foundedYear: "2015", teamSize: "2-5" });
    expect(parsed).toMatchObject({ handle: "studio", startingPriceJod: 250, foundedYear: 2015, teamSize: "2-5", bio: "", about: "", strengths: "" });
    expect(studioProfileSchema.safeParse({ ...profile, email: "nope" }).success).toBe(false);
    expect(studioProfileSchema.safeParse({ ...profile, foundedYear: "1900" }).success).toBe(false);
    expect(studioProfileSchema.safeParse({ ...profile, teamSize: "100" }).success).toBe(false);
  });
  it("package: a known service, a positive integer price and a billing cycle", () => {
    const ok = { title: "Starter", service: "smm_management", priceJod: "150", billing: "monthly" };
    expect(packageSchema.parse(ok)).toMatchObject({ priceJod: 150, description: "", deliverables: "" });
    expect(packageSchema.safeParse({ ...ok, service: "alchemy" }).success).toBe(false);
    expect(packageSchema.safeParse({ ...ok, priceJod: "0" }).success).toBe(false);
    expect(packageSchema.safeParse({ ...ok, billing: "weekly" }).success).toBe(false);
  });
});
