// Scope-to-team planner (docs/50 §planner, AC22/AC23): pure rules first. A
// brief's deliverables map to work packages by catalogue group and to the
// roles that usually deliver them; coverage is decided only from what the
// agency has in house, its accepted partners, its roster and an authorized
// discovery read. A candidate is a suggestion with inspectable sources, never
// a booking, a hold or a change to client matching.
import { DELIVERABLE_GROUPS, deliverable, type DeliverableGroup } from "@/lib/deliverables";
import type { DeliverableLine, PlanCandidate, PlanPackage } from "@/lib/db/schema";
import { ROLE_KEYS } from "@/lib/services/catalog";
import { redactBrief } from "./redact";

/** Roles that usually deliver each catalogue item (taxonomy, not a judgement about any provider). */
export const DELIVERABLE_ROLES: Record<string, string[]> = {
  feed_posts: ["graphic_designer", "content_writer_ar"], carousels: ["graphic_designer", "content_writer_ar"], reels: ["videographer", "video_editor"], stories: ["graphic_designer"],
  graphic_designs: ["graphic_designer"], captions: ["content_writer_ar"], motion_videos: ["motion_designer"], blog_articles: ["content_writer_ar"],
  account_management: ["social_media_manager"], community_replies: ["community_manager"], account_setup: ["social_media_manager"], content_calendar: ["social_media_manager", "strategist"],
  ad_campaigns: ["media_buyer"], ad_creatives: ["graphic_designer"], influencer_posts: ["influencer_manager"],
  website_pages: ["web_developer", "ui_ux_designer"], landing_page: ["web_developer", "ui_ux_designer"], online_store: ["web_developer"], website_maintenance: ["web_developer"], seo_optimization: ["seo_specialist"], hosting_domain: ["web_developer"],
  logo: ["graphic_designer"], brand_identity: ["graphic_designer"], brand_guidelines: ["graphic_designer"], packaging: ["graphic_designer"],
  photo_session: ["photographer"], video_shoot_day: ["videographer"], event_coverage: ["photographer", "videographer"], print_materials: ["graphic_designer", "printing_production"], outdoor_ad: ["graphic_designer", "printing_production"], activation_event: ["event_manager"],
  monthly_report: ["data_analyst"], strategy_session: ["strategist"],
};

export type DraftPackage = { key: string; title: string; deliverables: DeliverableLine[]; roles: string[] };

/** One package per catalogue group present in the brief, in catalogue order; roles are the union for its lines. */
export function draftPackages(lines: DeliverableLine[]): DraftPackage[] {
  const byGroup = new Map<DeliverableGroup, DeliverableLine[]>();
  for (const l of lines) {
    const d = deliverable(l.key);
    if (!d) continue;
    byGroup.set(d.group, [...(byGroup.get(d.group) ?? []), { key: l.key, quantity: l.quantity, platform: l.platform ?? null }]);
  }
  return DELIVERABLE_GROUPS.filter((g) => byGroup.has(g)).map((g) => {
    const ls = byGroup.get(g)!;
    const roles = [...new Set(ls.flatMap((l) => DELIVERABLE_ROLES[l.key] ?? []))].filter((r) => ROLE_KEYS.includes(r));
    return { key: g, title: g, deliverables: ls, roles };
  });
}

export type CoverageInput = {
  teamRoles: string[];
  partners: { id: string; roles: string[] }[];
  roster: { id: string; roles: string[] }[];
  discovered: { id: string; roles: string[]; reasons: string[] }[];
};

const MAX_CANDIDATES = 3;

/** Coverage per role, from the agency's own facts outward. A partner suggestion is still only a suggestion. */
export function coverPackages(packages: DraftPackage[], input: CoverageInput): PlanPackage[] {
  const pick = (role: string): { kind: PlanPackage["coverage"][number]["kind"]; candidates: PlanCandidate[] } => {
    if (input.teamRoles.includes(role)) return { kind: "in_house", candidates: [] };
    const partners = input.partners.filter((p) => p.roles.includes(role)).slice(0, MAX_CANDIDATES).map<PlanCandidate>((p) => ({ agencyId: p.id, source: "partner", reasons: ["partner", "role"] }));
    if (partners.length) return { kind: "partner", candidates: partners };
    const seen = new Set<string>();
    const others: PlanCandidate[] = [];
    for (const r of input.roster) if (r.roles.includes(role) && !seen.has(r.id) && others.length < MAX_CANDIDATES) { seen.add(r.id); others.push({ agencyId: r.id, source: "roster", reasons: ["saved", "role"] }); }
    for (const d of input.discovered) if (d.roles.includes(role) && !seen.has(d.id) && others.length < MAX_CANDIDATES) { seen.add(d.id); others.push({ agencyId: d.id, source: "discovery", reasons: d.reasons }); }
    return others.length ? { kind: "candidate", candidates: others } : { kind: "unfilled", candidates: [] };
  };
  return packages.map((p) => ({ ...p, coverage: p.roles.map((role) => ({ role, ...pick(role) })) }));
}

/** Roles a plan still needs from outside (for the "find someone" links). */
export function openRoles(packages: PlanPackage[]) {
  return [...new Set(packages.flatMap((p) => p.coverage.filter((c) => c.kind !== "in_house").map((c) => c.role)))];
}

export type ModelPackages = { key: string; title: string; deliverableKeys: string[]; roles: string[] }[];

/**
 * A model may regroup or retitle packages, nothing more. Its output is accepted
 * only if every deliverable key comes from the brief (each used once); roles are
 * re-derived from the taxonomy and titles are redacted; otherwise the
 * deterministic draft stands.
 */
export function applyModelPackages(raw: unknown, lines: DeliverableLine[]): DraftPackage[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 12) return null;
  const allowed = new Map(lines.filter((l) => deliverable(l.key)).map((l) => [l.key, { key: l.key, quantity: l.quantity, platform: l.platform ?? null }]));
  const used = new Set<string>();
  const out: DraftPackage[] = [];
  for (const [i, p] of (raw as unknown[]).entries()) {
    if (!p || typeof p !== "object") return null;
    const o = p as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim().slice(0, 80) : "";
    const keys = Array.isArray(o.deliverableKeys) ? o.deliverableKeys.filter((k): k is string => typeof k === "string") : [];
    if (!title || !keys.length) return null;
    for (const k of keys) { if (!allowed.has(k) || used.has(k)) return null; used.add(k); }
    const deliverables = keys.map((k) => allowed.get(k)!);
    const taxonomyRoles = [...new Set(deliverables.flatMap((l) => DELIVERABLE_ROLES[l.key] ?? []))];
    // Roles come from the taxonomy of the keys the model grouped, never from the model itself.
    out.push({ key: `p${i + 1}`, title: redactBrief(title, 80), deliverables, roles: taxonomyRoles.filter((r) => ROLE_KEYS.includes(r)) });
  }
  if (used.size !== allowed.size) return null;
  return out;
}
