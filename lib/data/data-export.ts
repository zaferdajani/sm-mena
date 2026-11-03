import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, auditLogs, consentLog, follows, likes, ownerMatches, ownerNeeds, packages, portfolioClients, posts, saves, users } from "@/lib/db/schema";

// "Download my data" (PDPL art. 4 right of access / GDPR art. 15 and 20): everything we hold about
// the signed-in person as one JSON file. Secrets (password hash, two-factor material, session tokens)
// are never included, and neither is other people's personal data (inquiry senders, chat partners).

export async function buildDataExport(userId: string) {
  const db = await getDb();
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) return null;
  const [agency] = await db.select().from(agencies).where(eq(agencies.ownerUserId, userId));
  const agencyPosts = agency ? await db.select().from(posts).where(eq(posts.agencyId, agency.id)) : [];
  // Likes, saves and follows are keyed by the visitor id, which is the account id once a device has signed in (docs/41).
  const visitor = userId;
  return {
    exportedAt: new Date().toISOString(),
    format: "sawwiq-data-export/1",
    account: {
      id: u.id,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      consentVersion: u.consentVersion,
      consentAt: u.consentAt,
      ageConfirmedAt: u.ageConfirmedAt,
      closedAt: u.disabledAt,
      twoFactorEnabled: Boolean(u.totpEnabledAt),
    },
    consents: await db.select({ kind: consentLog.kind, policyVersion: consentLog.policyVersion, granted: consentLog.granted, at: consentLog.createdAt }).from(consentLog).where(eq(consentLog.userId, userId)).orderBy(desc(consentLog.createdAt)),
    agency: agency ?? null,
    posts: agencyPosts,
    packages: agency ? await db.select().from(packages).where(eq(packages.agencyId, agency.id)) : [],
    portfolioClients: agency ? await db.select().from(portfolioClients).where(eq(portfolioClients.agencyId, agency.id)) : [],
    needs: await db.select().from(ownerNeeds).where(eq(ownerNeeds.userId, userId)),
    introductions: await db.select().from(ownerMatches).where(eq(ownerMatches.ownerUserId, userId)),
    saved: (await db.select().from(saves).where(eq(saves.visitorId, visitor))).map((r) => ({ postId: r.postId, at: r.createdAt })),
    liked: (await db.select().from(likes).where(eq(likes.visitorId, visitor))).map((r) => ({ postId: r.postId, at: r.createdAt })),
    following: (await db.select().from(follows).where(eq(follows.visitorId, visitor))).map((r) => ({ agencyId: r.agencyId, at: r.createdAt })),
    activity: (await db.select({ action: auditLogs.action, entity: auditLogs.entity, at: auditLogs.createdAt }).from(auditLogs).where(eq(auditLogs.actorUserId, userId)).orderBy(desc(auditLogs.createdAt)).limit(1000)),
    note: "Contracts and payment records are kept by law and are available from your contract pages. Ask privacy@sawwiq.org for anything not listed here.",
  };
}
