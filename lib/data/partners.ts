import "server-only";
import { and, desc, eq, inArray, ne, or } from "drizzle-orm";
import { inCountry } from "@/lib/data/agency-filters";
import { addNotifications } from "@/lib/data/notifications";
import { getDb } from "@/lib/db";
import { agencies, partnerRequests, type Agency, type PartnerRequest } from "@/lib/db/schema";
import { mediaUrl } from "@/lib/storage";
import { rolesOf, ROLE_KEYS } from "@/lib/services/catalog";
import { customTags } from "@/lib/services/tags";

// Agencies and freelancers working together (docs/30-services-and-partners.md):
// an agency says which roles it lacks, Sawwiq suggests who has them, and a
// partnership request opens contact between the two.

export type PartnerCard = {
  id: string;
  handle: string;
  name: string;
  kind: "agency" | "freelancer";
  city: string;
  country: string;
  avatarUrl: string | null;
  isVerified: boolean;
  ratingAverage: number | null;
  /** Roles this one covers that the asking agency is looking for. */
  matched: string[];
};

/** Roles an agency or freelancer can cover: what they said they have, and what their services imply. */
const offeredRoles = (a: Pick<Agency, "teamRoles" | "services">) => new Set([...a.teamRoles, ...rolesOf(a.services)]);

/** Freelancers and agencies in the same country (or serving it) that cover the roles an agency looks for. */
export async function suggestPartners(me: Agency, roles: string[] = me.seeksRoles, limit = 24): Promise<PartnerCard[]> {
  const wanted = roles.filter((r) => ROLE_KEYS.includes(r));
  if (!wanted.length) return [];
  await customTags();
  const db = await getDb();
  const rows = await db
    .select()
    .from(agencies)
    .where(and(eq(agencies.status, "active"), ne(agencies.id, me.id), inCountry(me.country)))
    .limit(400);
  return rows
    .map((a) => {
      const offer = offeredRoles(a);
      const matched = wanted.filter((r) => offer.has(r));
      const rating = a.ratingCount ? a.ratingSum / a.ratingCount : 0;
      // Published work counts: an empty page is a weaker suggestion.
      const score = matched.length * 10 + Math.min(a.postCount, 10) * 0.5 + (a.kind === "freelancer" ? 3 : 0) + (a.city === me.city ? 3 : 0) + (a.country === me.country ? 2 : 0) + (a.isVerified ? 2 : 0) + rating;
      return { a, matched, score };
    })
    .filter((x) => x.matched.length > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map(({ a, matched }) => ({
      id: a.id,
      handle: a.handle,
      name: a.name,
      kind: a.kind,
      city: a.city,
      country: a.country,
      avatarUrl: mediaUrl(a.avatarKey),
      isVerified: a.isVerified,
      ratingAverage: a.ratingCount ? Math.round((a.ratingSum / a.ratingCount) * 10) / 10 : null,
      matched,
    }));
}

export async function sendPartnerRequest(from: Agency, toId: string, roles: string[], message: string): Promise<{ ok: true } | { error: "self" | "notFound" | "exists" }> {
  if (toId === from.id) return { error: "self" };
  const db = await getDb();
  const [to] = await db.select({ id: agencies.id }).from(agencies).where(and(eq(agencies.id, toId), eq(agencies.status, "active")));
  if (!to) return { error: "notFound" };
  const [open] = await db
    .select({ id: partnerRequests.id })
    .from(partnerRequests)
    .where(and(eq(partnerRequests.status, "pending"), or(and(eq(partnerRequests.fromAgencyId, from.id), eq(partnerRequests.toAgencyId, toId)), and(eq(partnerRequests.fromAgencyId, toId), eq(partnerRequests.toAgencyId, from.id)))));
  if (open) return { error: "exists" };
  await db.transaction(async (tx) => {
    await tx.insert(partnerRequests).values({ fromAgencyId: from.id, toAgencyId: toId, roles: roles.filter((r) => ROLE_KEYS.includes(r)).slice(0, 8), message: message.trim().slice(0, 1000) });
    await addNotifications([{ agencyId: toId, kind: "partner_request", href: "/studio/partners", params: { name: from.name } }], tx);
  });
  return { ok: true };
}

type Side = { id: string; handle: string; name: string; kind: "agency" | "freelancer"; city: string; avatarUrl: string | null; whatsapp: string | null; email: string | null };
export type PartnerRow = PartnerRequest & { other: Side; incoming: boolean };

/** Requests sent and received; the other side's contact details only once accepted. */
export async function listPartnerRequests(agencyId: string): Promise<PartnerRow[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(partnerRequests)
    .where(or(eq(partnerRequests.fromAgencyId, agencyId), eq(partnerRequests.toAgencyId, agencyId)))
    .orderBy(desc(partnerRequests.createdAt))
    .limit(100);
  if (!rows.length) return [];
  const ids = [...new Set(rows.map((r) => (r.fromAgencyId === agencyId ? r.toAgencyId : r.fromAgencyId)))];
  const others = new Map((await db.select().from(agencies).where(inArray(agencies.id, ids))).map((a) => [a.id, a]));
  return rows.flatMap((r) => {
    const incoming = r.toAgencyId === agencyId;
    const o = others.get(incoming ? r.fromAgencyId : r.toAgencyId);
    if (!o) return [];
    const open = r.status === "accepted";
    return [{ ...r, incoming, other: { id: o.id, handle: o.handle, name: o.name, kind: o.kind, city: o.city, avatarUrl: mediaUrl(o.avatarKey), whatsapp: open ? o.whatsapp : null, email: open ? o.email : null } }];
  });
}

export async function answerPartnerRequest(agency: Agency, requestId: string, answer: "accepted" | "declined" | "cancelled"): Promise<boolean> {
  const db = await getDb();
  // The receiver accepts or declines; the sender can only cancel.
  const who = answer === "cancelled" ? eq(partnerRequests.fromAgencyId, agency.id) : eq(partnerRequests.toAgencyId, agency.id);
  const [row] = await db
    .update(partnerRequests)
    .set({ status: answer, respondedAt: new Date() })
    .where(and(eq(partnerRequests.id, requestId), eq(partnerRequests.status, "pending"), who))
    .returning();
  if (!row) return false;
  if (answer === "accepted") await addNotifications([{ agencyId: row.fromAgencyId, kind: "partner_accepted", href: "/studio/partners", params: { name: agency.name } }]);
  return true;
}

export async function pendingPartnerCount(agencyId: string) {
  const db = await getDb();
  const rows = await db.select({ id: partnerRequests.id }).from(partnerRequests).where(and(eq(partnerRequests.toAgencyId, agencyId), eq(partnerRequests.status, "pending")));
  return rows.length;
}
