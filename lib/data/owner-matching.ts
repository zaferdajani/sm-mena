import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, ownerMatches, ownerNeeds, users } from "@/lib/db/schema";
import { addNotifications } from "@/lib/data/notifications";
import { countryName } from "@/lib/core/catalog/countries";
import { SERVICE_GROUPS } from "@/lib/core/catalog/services/catalog";
import { matchOwner, OWNER_MATCH_LIMIT, type OwnerMatch, type ProviderFacts } from "@/lib/core/rules/matching/owners";
import { isRegistrationPhase } from "@/lib/launch-phase";
import { sendPlainEmail } from "@/lib/notify";

// Owner ↔ provider matching (docs/59). Three steps, each its own call so staff can preview before anything
// leaves the building: compute (suggestions, idempotent), send (one email per owner, only when discovery is
// open or the switch is on), respond (the owner accepts or declines; acceptance introduces the two sides).

export const OWNER_MATCH_EMAILS = () => process.env.OWNER_MATCH_EMAILS === "on" || !isRegistrationPhase();


async function providerFacts(country: string): Promise<ProviderFacts[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: agencies.id, country: agencies.country, city: agencies.city, servesCountries: agencies.servesCountries, services: agencies.services, industries: agencies.industries, isDemo: agencies.isDemo, status: agencies.status, postCount: agencies.postCount, bio: agencies.bio })
    .from(agencies)
    .where(and(eq(agencies.isDemo, false), eq(agencies.status, "active"), sql`(${agencies.country} = ${country} or ${country} = any(${agencies.servesCountries}))`));
  return rows.map((r) => ({ id: r.id, country: r.country, city: r.city, servesCountries: r.servesCountries, services: r.services, industries: r.industries, isDemo: r.isDemo, active: r.status === "active", postCount: r.postCount, hasBio: r.bio.trim().length > 0 }));
}

export type ComputeSummary = { batchId: string; owners: number; matched: number; suggestions: number; perOwner: { ownerUserId: string; matches: OwnerMatch[] }[] };

/**
 * Recompute suggestions for every registered owner. Rows the owner already answered (accepted/declined) or
 * that were already sent are kept as they are; new suggestions are inserted, stale unsent suggestions removed.
 */
export async function computeOwnerMatches({ dryRun = false, limit = OWNER_MATCH_LIMIT } = {}): Promise<ComputeSummary> {
  const db = await getDb();
  const needs = await db.select().from(ownerNeeds);
  const batchId = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const byCountry = new Map<string, ProviderFacts[]>();
  const perOwner: ComputeSummary["perOwner"] = [];
  let suggestions = 0;
  for (const need of needs) {
    let providers = byCountry.get(need.country);
    if (!providers) { providers = await providerFacts(need.country); byCountry.set(need.country, providers); }
    const matches = matchOwner({ country: need.country, city: need.city, businessType: need.businessType, services: need.services }, providers, limit);
    perOwner.push({ ownerUserId: need.userId, matches });
    if (dryRun) continue;
    const existing = await db.select({ agencyId: ownerMatches.agencyId, status: ownerMatches.status }).from(ownerMatches).where(eq(ownerMatches.ownerUserId, need.userId));
    const keep = new Set(existing.filter((e) => e.status !== "suggested").map((e) => e.agencyId));
    const wanted = matches.filter((m) => !keep.has(m.agencyId));
    // drop stale unsent suggestions, upsert the current ones
    const wantedIds = wanted.map((m) => m.agencyId);
    await db.delete(ownerMatches).where(and(eq(ownerMatches.ownerUserId, need.userId), eq(ownerMatches.status, "suggested"), wantedIds.length ? sql`${ownerMatches.agencyId} not in ${wantedIds}` : sql`true`));
    for (const m of wanted) {
      await db
        .insert(ownerMatches)
        .values({ ownerUserId: need.userId, agencyId: m.agencyId, score: m.score, reasons: m.reasons, batchId })
        .onConflictDoUpdate({ target: [ownerMatches.ownerUserId, ownerMatches.agencyId], set: { score: m.score, reasons: m.reasons, batchId, updatedAt: new Date() } });
      suggestions++;
    }
  }
  return { batchId, owners: needs.length, matched: perOwner.filter((p) => p.matches.length).length, suggestions, perOwner };
}

export type OwnerMatchView = { id: string; status: string; score: number; reasons: string[]; sentAt: Date | null; agency: { id: string; handle: string; name: string; city: string; country: string; services: string[]; postCount: number; kind: string } };

export async function listOwnerMatches(ownerUserId: string): Promise<OwnerMatchView[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: ownerMatches.id, status: ownerMatches.status, score: ownerMatches.score, reasons: ownerMatches.reasons, sentAt: ownerMatches.sentAt, agencyId: agencies.id, handle: agencies.handle, name: agencies.name, city: agencies.city, country: agencies.country, services: agencies.services, postCount: agencies.postCount, kind: agencies.kind })
    .from(ownerMatches)
    .innerJoin(agencies, eq(agencies.id, ownerMatches.agencyId))
    .where(eq(ownerMatches.ownerUserId, ownerUserId))
    .orderBy(desc(ownerMatches.score));
  return rows.map((r) => ({ id: r.id, status: r.status, score: r.score, reasons: r.reasons, sentAt: r.sentAt, agency: { id: r.agencyId, handle: r.handle, name: r.name, city: r.city, country: r.country, services: r.services, postCount: r.postCount, kind: r.kind } }));
}

/** The matches an owner may see: only after they were sent (suggestions are staff-only until then). */
export const visibleToOwner = (m: { status: string }) => m.status !== "suggested";

const groupLabel = (key: string, locale: string) => { const g = SERVICE_GROUPS.find((x) => x.key === key); return g ? (locale === "ar" ? g.name_ar : g.name_en) : key; };

export type SendSummary = { attempted: number; sent: number; skipped: "closed" | null };

/**
 * One email per owner with unsent suggestions, listing their matches and the link to choose. Sends nothing
 * while discovery is closed unless OWNER_MATCH_EMAILS=on; staff see that in the summary.
 */
export async function sendOwnerMatchEmails(siteUrl: string, { force = false } = {}): Promise<SendSummary> {
  if (!force && !OWNER_MATCH_EMAILS()) return { attempted: 0, sent: 0, skipped: "closed" };
  const db = await getDb();
  const pending = await db
    .select({ ownerUserId: ownerMatches.ownerUserId })
    .from(ownerMatches)
    .where(eq(ownerMatches.status, "suggested"))
    .groupBy(ownerMatches.ownerUserId);
  let sent = 0;
  for (const { ownerUserId } of pending) {
    const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, ownerUserId)).limit(1);
    const [need] = await db.select().from(ownerNeeds).where(eq(ownerNeeds.userId, ownerUserId)).limit(1);
    if (!user || !need) continue;
    const matches = (await listOwnerMatches(ownerUserId)).filter((m) => m.status === "suggested");
    if (!matches.length) continue;
    const ar = need.locale !== "en";
    const link = `${siteUrl}/${ar ? "ar" : "en"}/owner/matches`;
    const lines = ar
      ? [`مرحباً،`, ``, `فُتحت صفحات أوائل مزودي خدمات التسويق على سوّق، ووجدنا ${matches.length} ${matches.length === 1 ? "مزوداً" : "مزودين"} في ${countryName(need.country, "ar")} يناسبون ما سجّلته:`, ``, ...matches.map((m, i) => `${i + 1}. ${m.agency.name} — ${m.agency.city}`), ``, `اختر من تريد التعريف به من هذه الصفحة، ولن يتواصل معك أحد قبل ذلك:`, link, ``, `سوّق`]
      : [`Hello,`, ``, `The first marketing providers' pages on Sawwiq are open, and we found ${matches.length} provider${matches.length === 1 ? "" : "s"} in ${countryName(need.country, "en")} who fit what you registered:`, ``, ...matches.map((m, i) => `${i + 1}. ${m.agency.name} — ${m.agency.city}`), ``, `Choose whom you would like to be introduced to on this page; nobody contacts you before that:`, link, ``, `Sawwiq`];
    const ok = await sendPlainEmail(user.email, ar ? "مزودون يناسبون مشروعك على سوّق" : "Providers that fit your business on Sawwiq", lines, "owner-matches");
    if (!ok) continue;
    await db.update(ownerMatches).set({ status: "sent", sentAt: new Date(), updatedAt: new Date() }).where(and(eq(ownerMatches.ownerUserId, ownerUserId), eq(ownerMatches.status, "suggested")));
    sent++;
  }
  return { attempted: pending.length, sent, skipped: null };
}

export type RespondResult = "accepted" | "declined" | "notFound" | "notSent";

/**
 * The owner's answer. Acceptance is the consent: it introduces the two sides — the provider gets an in-app
 * notification and an email with the need and the owner's contact; the match becomes "introduced".
 */
export async function respondToOwnerMatch(ownerUserId: string, matchId: string, answer: "accept" | "decline", siteUrl: string, locale: string): Promise<RespondResult> {
  const db = await getDb();
  const [row] = await db.select().from(ownerMatches).where(and(eq(ownerMatches.id, matchId), eq(ownerMatches.ownerUserId, ownerUserId))).limit(1);
  if (!row) return "notFound";
  if (row.status === "suggested") return "notSent";
  const now = new Date();
  if (answer === "decline") {
    await db.update(ownerMatches).set({ status: "declined", respondedAt: now, updatedAt: now }).where(eq(ownerMatches.id, row.id));
    return "declined";
  }
  await db.update(ownerMatches).set({ status: "introduced", respondedAt: now, introducedAt: now, updatedAt: now }).where(eq(ownerMatches.id, row.id));
  const [need] = await db.select().from(ownerNeeds).where(eq(ownerNeeds.userId, ownerUserId)).limit(1);
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, ownerUserId)).limit(1);
  const [agency] = await db.select({ id: agencies.id, email: agencies.email, name: agencies.name, contentLang: agencies.contentLang }).from(agencies).where(eq(agencies.id, row.agencyId)).limit(1);
  if (need && user && agency) {
    const groups = need.services.map((g) => groupLabel(g, agency.contentLang === "en" ? "en" : "ar")).join("، ");
    await addNotifications([{ agencyId: agency.id, kind: "owner_intro", href: "/studio/notifications", params: { city: need.city, services: need.services.join(",") } }]);
    const ar = agency.contentLang !== "en";
    const lines = ar
      ? [`مرحباً ${agency.name}،`, ``, `صاحب مشروع سجّل على سوّق طلب التعريف بكم.`, ``, `المدينة: ${need.city} (${countryName(need.country, "ar")})`, `ما يحتاج إليه: ${groups}`, `التوقيت: ${need.timing}`, need.note ? `ملاحظته: ${need.note}` : ``, ``, `للتواصل: ${user.email}${need.whatsapp ? ` · واتساب ${need.whatsapp}` : ""}`, ``, `وافق صاحب المشروع على هذا التعريف بنفسه. ${siteUrl}/${locale}/studio/notifications`, ``, `سوّق`]
      : [`Hello ${agency.name},`, ``, `A business owner registered on Sawwiq asked to be introduced to you.`, ``, `City: ${need.city} (${countryName(need.country, "en")})`, `Needs: ${groups}`, `Timing: ${need.timing}`, need.note ? `Note: ${need.note}` : ``, ``, `Contact: ${user.email}${need.whatsapp ? ` · WhatsApp ${need.whatsapp}` : ""}`, ``, `The owner agreed to this introduction. ${siteUrl}/${locale}/studio/notifications`, ``, `Sawwiq`];
    await sendPlainEmail(agency.email, ar ? "صاحب مشروع يطلب التعريف بكم على سوّق" : "A business owner asked to be introduced to you on Sawwiq", lines.filter((l) => l !== undefined), "owner-intro");
  }
  return "accepted";
}

export type OwnerOverviewRow = { userId: string; emailMasked: string; country: string; city: string; businessType: string | null; services: string[]; timing: string; createdAt: Date; matches: { agencyName: string; handle: string; score: number; status: string }[] };

const mask = (email: string) => { const [u, d] = email.split("@"); return `${u.slice(0, 2)}…@${d ?? ""}`; };

/** Admin → Business owners: every registration with its current matches (addresses partly hidden). */
export async function ownerOverview(): Promise<OwnerOverviewRow[]> {
  const db = await getDb();
  const rows = await db.select({ need: ownerNeeds, email: users.email }).from(ownerNeeds).innerJoin(users, eq(users.id, ownerNeeds.userId)).orderBy(desc(ownerNeeds.createdAt));
  const ids = rows.map((r) => r.need.userId);
  const matches = ids.length
    ? await db.select({ ownerUserId: ownerMatches.ownerUserId, score: ownerMatches.score, status: ownerMatches.status, agencyName: agencies.name, handle: agencies.handle }).from(ownerMatches).innerJoin(agencies, eq(agencies.id, ownerMatches.agencyId)).where(inArray(ownerMatches.ownerUserId, ids)).orderBy(desc(ownerMatches.score))
    : [];
  return rows.map((r) => ({ userId: r.need.userId, emailMasked: mask(r.email), country: r.need.country, city: r.need.city, businessType: r.need.businessType, services: r.need.services, timing: r.need.timing, createdAt: r.need.createdAt, matches: matches.filter((m) => m.ownerUserId === r.need.userId).map((m) => ({ agencyName: m.agencyName, handle: m.handle, score: m.score, status: m.status })) }));
}
