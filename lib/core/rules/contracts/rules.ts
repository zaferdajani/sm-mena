/**
 * The milestone rules both sides agree to (terms v4, docs/14-contracts-and-milestones.md),
 * as pure functions: acceptance deadlines and reminders, revision rounds,
 * fee and split math, the one appeal, and the default cancellation split.
 * The data layer (lib/data/contracts.ts and friends) enforces them in SQL.
 */

const DAY = 86_400_000;

/** Days a client has to review a delivery before it counts as accepted (MILESTONE_REVIEW_DAYS overrides, 3–30). */
export const DEFAULT_REVIEW_DAYS = 7;
export const reviewDaysSetting = () => clampInt(process.env.MILESTONE_REVIEW_DAYS, DEFAULT_REVIEW_DAYS, 3, 30);

/** Rounds of "request changes" each milestone includes unless the contract says otherwise. */
export const DEFAULT_REVISION_ROUNDS = 2;
export const MAX_REVISION_ROUNDS = 10;

/** Days either side has to appeal a dispute decision (once). */
export const APPEAL_DAYS = 7;

/** Reminders before the acceptance deadline, in days left (first, second). */
export const REMINDER_DAYS = [2, 1] as const;

function clampInt(raw: string | undefined, fallback: number, min: number, max: number) {
  const n = raw?.trim() ? Number(raw) : fallback;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

export const clampRounds = (n: number | null | undefined) => (Number.isInteger(n) ? Math.min(MAX_REVISION_ROUNDS, Math.max(0, n as number)) : DEFAULT_REVISION_ROUNDS);
export const clampReviewDays = (n: number | null | undefined) => (Number.isInteger(n) ? Math.min(30, Math.max(3, n as number)) : DEFAULT_REVIEW_DAYS);

// ── Acceptance deadline ────────────────────────────────────────────────────

export const reviewDeadline = (submittedAt: Date, reviewDays: number) => new Date(submittedAt.getTime() + reviewDays * DAY);

/** Whole days left before the deadline, rounded up (0 once it has passed). */
export const daysLeft = (dueAt: Date, now = new Date()) => Math.max(0, Math.ceil((dueAt.getTime() - now.getTime()) / DAY));

/**
 * Which reminder is due now: 1 (two days left), 2 (one day left) or null.
 * `sent` is how many were already sent for this delivery. A job that ran late
 * sends only the latest one, never two at once.
 */
export function reminderDue(dueAt: Date, sent: number, now = new Date()): 1 | 2 | null {
  if (now >= dueAt) return null;
  const left = daysLeft(dueAt, now);
  if (left <= REMINDER_DAYS[1] && sent < 2) return 2;
  if (left <= REMINDER_DAYS[0] && sent < 1) return 1;
  return null;
}

/** A delivery is deemed accepted once its deadline passed with no change request or dispute. */
export const deemedAccepted = (m: { status: string; reviewDueAt: Date | null }, now = new Date()) => m.status === "submitted" && m.reviewDueAt !== null && m.reviewDueAt <= now;

// ── Revision rounds ────────────────────────────────────────────────────────

export type RoundsState = { included: number; extra: number; used: number; left: number };

export function roundsState(contract: { revisionRounds: number }, m: { changeRounds: number; extraRounds: number }): RoundsState {
  const included = contract.revisionRounds;
  const left = Math.max(0, included + m.extraRounds - m.changeRounds);
  return { included, extra: m.extraRounds, used: m.changeRounds, left };
}

export const canRequestChanges = (contract: { revisionRounds: number }, m: { changeRounds: number; extraRounds: number }) => roundsState(contract, m).left > 0;

// ── Money ──────────────────────────────────────────────────────────────────

/** Sawwiq's fee on an amount paid out (the refunded part carries no fee). */
export const feeOn = (releasedFils: number, feePercent: number) => Math.round((releasedFils * feePercent) / 100);

/** A release of `grossFils`: what the agency receives and what Sawwiq keeps. */
export const payout = (grossFils: number, feePercent: number) => {
  const fee = feeOn(grossFils, feePercent);
  return { gross: grossFils, fee, net: grossFils - fee };
};

export type Split = { releaseFils: number; refundFils: number };
export type SplitError = "negative" | "sum" | "integer";

/** A split must use whole fils, no negatives, and add up to exactly what is held. */
export function checkSplit(s: Split, heldFils: number): SplitError | null {
  if (!Number.isInteger(s.releaseFils) || !Number.isInteger(s.refundFils)) return "integer";
  if (s.releaseFils < 0 || s.refundFils < 0) return "negative";
  if (s.releaseFils + s.refundFils !== heldFils) return "sum";
  return null;
}

export const splitKind = (s: Split): "release" | "refund" | "split" => (s.refundFils === 0 ? "release" : s.releaseFils === 0 ? "refund" : "split");

/** Milestone statuses where the client's money is held for it (protected mode). */
export const HELD_STATUSES = ["funded", "submitted", "changes_requested"] as const;
export const isHeld = (status: string) => (HELD_STATUSES as readonly string[]).includes(status);

/**
 * The proposal a mutual cancellation starts from: work not delivered yet is
 * refunded in full; work already delivered too (the proposer can change it).
 */
export function defaultCancellationSplit(ms: { id: string; status: string; amountFils: number }[]) {
  return ms.filter((m) => isHeld(m.status)).map((m) => ({ milestoneId: m.id, releaseFils: 0, refundFils: m.amountFils }));
}

// ── Disputes ───────────────────────────────────────────────────────────────

export const appealDeadline = (decidedAt: Date) => new Date(decidedAt.getTime() + APPEAL_DAYS * DAY);

/** A decision can be appealed once, within APPEAL_DAYS, and only the first decision. */
export function canAppeal(d: { status: string; appealedAt: Date | null; appealDeadline: Date | null }, now = new Date()) {
  return d.status === "decided" && !d.appealedAt && d.appealDeadline !== null && now < d.appealDeadline;
}

/** A first decision becomes final when the appeal window closes or both sides accept it. */
export function decisionFinal(d: { status: string; appealDeadline: Date | null; agencyAcceptedAt: Date | null; clientAcceptedAt: Date | null }, now = new Date()) {
  if (d.status !== "decided") return false;
  if (d.agencyAcceptedAt && d.clientAcceptedAt) return true;
  return d.appealDeadline !== null && now >= d.appealDeadline;
}

/** Links in evidence: http(s) only, trimmed, at most 5. */
export function cleanLinks(raw: string | string[]) {
  const list = (Array.isArray(raw) ? raw : raw.split(/\s+/)).map((l) => l.trim()).filter(Boolean);
  return list
    .filter((l) => {
      try {
        const u = new URL(l);
        return u.protocol === "https:" || u.protocol === "http:";
      } catch {
        return false;
      }
    })
    .map((l) => l.slice(0, 500))
    .slice(0, 5);
}
