// Ranking for collaborator discovery (docs/48-collaboration-v2.md §discovery).
// Pure: hard filters first, then a score with the reasons that produced it,
// then a deterministic order (score, then id) so pages never shuffle.
import type { AvailabilityState } from "./availability";
import type { WorkMode } from "./types";

export type Candidate = {
  id: string;
  kind: "agency" | "freelancer";
  country: string;
  servesCountries: string[];
  city: string;
  languages: string[];
  roles: string[];
  services: string[];
  /** Published posts tagged with each service (portfolio evidence). */
  postsByService: Record<string, number>;
  postCount: number;
  isVerified: boolean;
  isDemo: boolean;
  status: string;
  /** Stated collaboration preference; null = unknown. */
  openToWork: boolean | null;
  workModes: WorkMode[];
  availability: AvailabilityState;
  /** Accepted partner of the asker already. */
  partner: boolean;
  /** On the asker's private roster. */
  saved: boolean;
};

export type Query = {
  askerId: string;
  askerCountry: string;
  askerCity: string;
  roles: string[];
  services?: string[];
  languages?: string[];
  workMode?: WorkMode | null;
  city?: string | null;
  kind?: "agency" | "freelancer" | null;
  /** Drop everyone whose availability is not confirmed for the period. */
  confirmedOnly?: boolean;
  blocked: Set<string>;
  includeDemo: boolean;
};

export type Reason = "role" | "service_evidence" | "same_city" | "language" | "work_mode" | "verified" | "partner" | "saved" | "available" | "open_to_work";

export type Ranked = { candidate: Candidate; score: number; matchedRoles: string[]; matchedServices: string[]; reasons: Reason[]; group: "ready" | "needs_confirmation" };

/** Hard eligibility: wrong answers here are never "ranked lower", they are out. */
export function eligible(c: Candidate, q: Query): boolean {
  if (c.id === q.askerId || c.status !== "active") return false;
  if (q.blocked.has(c.id)) return false;
  if (c.isDemo && !q.includeDemo) return false;
  if (c.openToWork === false) return false;
  if (!(c.country === q.askerCountry || c.servesCountries.includes(q.askerCountry))) return false;
  if (q.kind && c.kind !== q.kind) return false;
  if (q.roles.length && !q.roles.some((r) => c.roles.includes(r))) return false;
  if (q.city && c.city !== q.city && !(q.workMode === "remote")) return false;
  if (q.workMode && c.workModes.length && !c.workModes.includes(q.workMode)) return false;
  if (c.availability === "busy") return false;
  if (q.confirmedOnly && c.availability !== "confirmed" && c.availability !== "limited") return false;
  return true;
}

export function rank(candidates: Candidate[], q: Query): Ranked[] {
  const out: Ranked[] = [];
  for (const c of candidates) {
    if (!eligible(c, q)) continue;
    const reasons: Reason[] = [];
    const matchedRoles = q.roles.filter((r) => c.roles.includes(r));
    const matchedServices = (q.services ?? []).filter((s) => c.services.includes(s));
    let score = matchedRoles.length * 10 + matchedServices.length * 4;
    if (matchedRoles.length) reasons.push("role");
    const evidence = Object.entries(c.postsByService).filter(([s]) => matchedServices.includes(s) || !q.services?.length).reduce((n, [, v]) => n + v, 0);
    if (evidence > 0) {
      score += Math.min(evidence, 8);
      reasons.push("service_evidence");
    }
    if (c.city === q.askerCity) { score += 3; reasons.push("same_city"); }
    if (q.languages?.length && q.languages.some((l) => c.languages.includes(l))) { score += 2; reasons.push("language"); }
    if (q.workMode && c.workModes.includes(q.workMode)) { score += 2; reasons.push("work_mode"); }
    if (c.isVerified) { score += 1; reasons.push("verified"); }
    if (c.partner) { score += 5; reasons.push("partner"); }
    if (c.saved) { score += 3; reasons.push("saved"); }
    if (c.availability === "confirmed" || c.availability === "limited") { score += 4; reasons.push("available"); }
    if (c.openToWork === true) { score += 1; reasons.push("open_to_work"); }
    const group = c.availability === "confirmed" || c.availability === "limited" ? "ready" : "needs_confirmation";
    out.push({ candidate: c, score, matchedRoles, matchedServices, reasons, group });
  }
  // Ready first, then score, then a stable tie-break on id.
  return out.sort((a, b) => (a.group === b.group ? 0 : a.group === "ready" ? -1 : 1) || b.score - a.score || (a.candidate.id < b.candidate.id ? -1 : 1));
}

export function page<T>(rows: T[], cursor: number, size = 20) {
  const start = Math.max(0, cursor);
  return { items: rows.slice(start, start + size), next: start + size < rows.length ? start + size : null, total: rows.length };
}
