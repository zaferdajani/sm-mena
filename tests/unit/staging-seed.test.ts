import "./setup-db";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { verifyPassword } from "@/lib/auth/password";
import { COUNTRIES } from "@/lib/countries";
import { createAgency } from "@/lib/data/agencies";
import { createUser, getUserByEmail } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { eq } from "drizzle-orm";
import { listClients } from "@/lib/data/portfolio-clients";
import { agencies, contracts, packages, posts, reviews, users } from "@/lib/db/schema";
import { STAGING_PASSWORD, seedStaging } from "@/lib/db/seed-staging";

afterAll(() => closeDb());
afterEach(() => vi.unstubAllEnvs());

describe("staging seed", () => {
  it("creates every role in every country and a sample contract", async () => {
    vi.stubEnv("STAGING_MODE", "true");
    vi.stubEnv("VIRTUAL_PAYMENTS", "sandbox");
    vi.stubEnv("PAYMENTS_PROVIDER", "mock");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("PROTECTED_PAYMENTS_LIVE", "");
    const handles: [string, string][] = [
      ["nakhla.studio", "amman"],
      ["petra.growth", "amman"],
      ["najd.creative", "riyadh"],
      ["dubai.loop", "dubai"],
      ["gulf.pixel.kw", "kuwait_city"],
      ["doha.frame", "doha"],
      ["manama.social", "manama"],
      ["muscat.media", "muscat"],
      ["nile.digital", "cairo"],
    ];
    for (const [handle, city] of handles) {
      const owner = await createUser(`${handle}@sawwiq.test`, "password-123456");
      await createAgency(owner.id, { handle, name: handle, city, services: ["smm_management"] }, { isDemo: true });
    }
    await seedStaging(() => {});

    const admin = await getUserByEmail("staging-admin@sawwiq.test");
    expect(admin?.role).toBe("admin");
    expect(await verifyPassword(STAGING_PASSWORD, admin!.passwordHash)).toBe(true);
    const platformOwner = await getUserByEmail("staging-owner@sawwiq.test");
    expect(platformOwner?.role).toBe("owner");

    for (const country of COUNTRIES) {
      const client = await getUserByEmail(`staging.owner.${country.code}@sawwiq.test`);
      const agency = await getUserByEmail(`staging.agency.${country.code}@sawwiq.test`);
      const freelancer = await getUserByEmail(`staging.free.${country.code}@sawwiq.test`);
      const agent = await getUserByEmail(`staging.agent.${country.code}@sawwiq.test`);
      expect(client?.role).toBe("client");
      expect(agency?.role).toBe("agency");
      expect(freelancer?.role).toBe("agency");
      expect(agent?.role).toBe("agent");
    }
    const roles = new Set((await (await getDb()).select({ role: users.role }).from(users)).map((u) => u.role));
    expect([...roles].sort()).toEqual(["admin", "agency", "agent", "backbone", "client", "maintenance", "owner", "support"]);

    const db = await getDb();
    const rows = await db.select({ title: contracts.title, status: contracts.status }).from(contracts);
    const byTitle = Object.fromEntries(rows.map((r) => [r.title, r.status]));
    expect(byTitle["Staging sent · nakhla.studio"]).toBe("sent");
    expect(byTitle["Staging active · petra.growth"]).toBe("active");
    expect(byTitle["Staging funded · najd.creative"]).toBe("active");
    expect(byTitle["Staging submitted · dubai.loop"]).toBe("active");
    expect(byTitle["Staging released · gulf.pixel.kw"]).toBe("completed");
    expect(byTitle["Staging refunded · doha.frame"]).toBe("active");
    expect(byTitle["Staging disputed · manama.social"]).toBe("disputed");
    expect(byTitle["Staging cancelled · muscat.media"]).toBe("cancelled");
    expect(byTitle["Staging direct · nile.digital"]).toBe("active");

    // Reference profiles: the staging agency and freelancer are filled in, once.
    await seedStaging(() => {});
    for (const [handle, clientCount, packageCount] of [["staging.agency.jo", 3, 3], ["staging.free.jo", 2, 2]] as const) {
      const [a] = await db.select().from(agencies).where(eq(agencies.handle, handle));
      expect(a.about.length).toBeGreaterThan(50);
      expect(a.strengths.length).toBeGreaterThan(2);
      expect(a.avatarKey).toBeTruthy();
      expect(a.pendingServices).toHaveLength(1);
      const clients = await listClients(a.id);
      expect(clients).toHaveLength(clientCount);
      expect(clients.every((c) => c.logoKey && c.links.length && c.description.length > 80)).toBe(true);
      const work = await db.select().from(posts).where(eq(posts.agencyId, a.id));
      expect(work.every((p) => p.clientId)).toBe(true);
      expect(work.filter((p) => p.embed?.provider === "youtube")).toHaveLength(1);
      expect(await db.select().from(packages).where(eq(packages.agencyId, a.id))).toHaveLength(packageCount);
      expect(await db.select().from(reviews).where(eq(reviews.agencyId, a.id))).toHaveLength(3);
    }
  }, 300_000);
});
