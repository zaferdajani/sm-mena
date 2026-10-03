// The Founding 100 (marketing/06 §3, docs/39): the founding *seat* is a
// membership number every real provider gets forever; the founding *cohort*
// is the first FOUNDING.size seats that also joined before the cohort closed,
// and only they receive the hands-on benefits, for a limited time. Pure, so
// the rules are unit-tested and the same on the page, the card and the studio.

export const FOUNDING = {
  /** Seats that can be in the cohort: the scarce thing is the team's onboarding time, not digital seats. */
  size: 100,
  /** The year on the badge; a dated badge never reads as a quality rank. */
  year: 2026,
  /** Days of premium tools once they are usable (counted from activation, never from joining). */
  benefitDays: 180,
  /** First Sawwiq-acquired completed protected project: Sawwiq platform fee is waived. */
  firstMarketplaceFeePercent: 0,
  /** Founder rate on subsequent Sawwiq-acquired protected work during the launch benefit year. */
  marketplaceFeePercent: 7,
  /** Founder rate lasts this many days from live protected-payment activation. */
  feeBenefitDays: 365,
  /** Qualified founder opportunities can be surfaced this much earlier during the launch window. */
  opportunityHeadStartHours: 24,
} as const;

/** The cohort closes at FOUNDING_CLOSES_AT (ISO date) or when the seats run out, whichever comes first. */
export const foundingClosesAt = (): Date | null => {
  const raw = process.env.FOUNDING_CLOSES_AT;
  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

/** When paid tools switched on for founding members (FOUNDING_ACTIVATED_AT); null until they exist. */
export const foundingActivatedAt = (): Date | null => {
  const raw = process.env.FOUNDING_ACTIVATED_AT;
  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

export type FoundingInput = { foundingSeat: number | null; createdAt: Date; isDemo: boolean };

/** In the cohort: a real provider with one of the first seats who joined before the cohort closed. */
export function isFoundingMember(a: FoundingInput, now = new Date(), closesAt = foundingClosesAt()): boolean {
  if (a.isDemo || a.foundingSeat == null || a.foundingSeat > FOUNDING.size) return false;
  if (closesAt && a.createdAt > closesAt) return false;
  void now;
  return true;
}

export type FoundingStatus = {
  member: boolean;
  seat: number | null;
  /** Seats still open in the cohort (0 when full or closed). */
  seatsLeft: number;
  /** Whether a new provider joining now would enter the cohort. */
  open: boolean;
  /** Premium tools run until this date; null while they are not switched on yet. */
  benefitsUntil: Date | null;
};

export function foundingStatus(a: FoundingInput, seatsTaken: number, now = new Date()): FoundingStatus {
  const closesAt = foundingClosesAt();
  const seatsLeft = Math.max(0, FOUNDING.size - seatsTaken);
  const open = seatsLeft > 0 && (!closesAt || now <= closesAt);
  const activated = foundingActivatedAt();
  const member = isFoundingMember(a, now, closesAt);
  return {
    member,
    seat: a.foundingSeat,
    seatsLeft,
    open,
    benefitsUntil: member && activated ? new Date(activated.getTime() + FOUNDING.benefitDays * 86_400_000) : null,
  };
}


/** Commercial founder perks require useful supply, not an email signup. */
export type FounderEligibilityInput = FoundingInput & {
  status?: "active" | "suspended" | "deactivated";
  bio?: string;
  services?: string[];
  postCount?: number;
  packageCount?: number;
};

export type FounderEligibility = {
  eligible: boolean;
  cohort: boolean;
  coreProfile: boolean;
  proofOfWork: boolean;
  reasons: ("cohort" | "inactive" | "profile" | "proof")[];
};

/**
 * Pure activation gate used by opportunities, Studio and future money features.
 * KYC/payment-provider checks are deliberately separate: they apply when money
 * features go live and must never be inferred from a completed profile.
 */
export function founderEligibility(a: FounderEligibilityInput, now = new Date()): FounderEligibility {
  const cohort = isFoundingMember(a, now);
  const active = (a.status ?? "active") === "active" && !a.isDemo;
  const coreProfile = Boolean(a.bio?.trim() && (a.services?.length ?? 0) > 0);
  const proofOfWork = (a.postCount ?? 0) > 0 || (a.packageCount ?? 0) > 0;
  const reasons: FounderEligibility["reasons"] = [];
  if (!cohort) reasons.push("cohort");
  if (!active) reasons.push("inactive");
  if (!coreProfile) reasons.push("profile");
  if (!proofOfWork) reasons.push("proof");
  return { eligible: cohort && active && coreProfile && proofOfWork, cohort, coreProfile, proofOfWork, reasons };
}

export type FounderFeeArgs = {
  eligible: boolean;
  protectedPaymentsLive: boolean;
  acquiredBySawwiq: boolean;
  /** Non-cancelled contracts of this agency that already carry the one-time waiver (0 or 1). */
  priorFeeWaiverReservations: number;
  activatedAt?: Date | null;
  now?: Date;
  standardFeePercent: number;
};

/** "waiver": the one-time 0% first project; "founder": the launch-year rate; "standard": everyone else. */
export type FounderFeeDecision = { fee: number; kind: "waiver" | "founder" | "standard" };

/**
 * Which Sawwiq platform fee a new protected contract carries. Founder terms
 * apply only to an eligible founder, on a Sawwiq-acquired brief, while real
 * protected payments are live, inside the founder year counted from
 * FOUNDING_ACTIVATED_AT. Direct contracts and the agency's own clients never
 * get an invented discount here.
 */
export function founderFeeDecision(args: FounderFeeArgs): FounderFeeDecision {
  const now = args.now ?? new Date();
  const standard = { fee: args.standardFeePercent, kind: "standard" as const };
  if (!args.eligible || !args.protectedPaymentsLive || !args.acquiredBySawwiq) return standard;
  const activated = args.activatedAt ?? foundingActivatedAt();
  if (!activated || now < activated) return standard;
  if (now.getTime() > activated.getTime() + FOUNDING.feeBenefitDays * 86_400_000) return standard;
  return args.priorFeeWaiverReservations === 0 ? { fee: FOUNDING.firstMarketplaceFeePercent, kind: "waiver" } : { fee: FOUNDING.marketplaceFeePercent, kind: "founder" };
}

/** Founder platform rate: 0% on the first Sawwiq-acquired project, then the launch-year rate. */
export const founderMarketplaceFee = (args: FounderFeeArgs) => founderFeeDecision(args).fee;

/**
 * The head start is a launch mechanic. It runs until FOUNDER_HEAD_START_UNTIL
 * (ISO date) when that is set; without the variable it stays on, so the owner
 * ends it with one setting and no deploy.
 */
export const founderHeadStartUntil = (): Date | null => {
  const raw = process.env.FOUNDER_HEAD_START_UNTIL;
  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

export function founderHeadStartActive(now = new Date(), until = founderHeadStartUntil()): boolean {
  return !until || now <= until;
}

/**
 * When an open brief becomes visible to a provider. Eligible founders see it
 * as soon as it exists; everyone else waits FOUNDING.opportunityHeadStartHours
 * while the head start runs. Relevance scores are never touched: once both
 * can see a brief, both see the same score.
 */
export function opportunityVisibleAt(createdAt: Date, eligibleFounder: boolean, headStart = founderHeadStartActive(createdAt)) {
  return eligibleFounder || !headStart ? createdAt : new Date(createdAt.getTime() + FOUNDING.opportunityHeadStartHours * 3_600_000);
}

/** The earliest `createdAt` a provider may see right now (the SQL side of `opportunityVisibleAt`). */
export function opportunityCutoff(now: Date, eligibleFounder: boolean, headStart = founderHeadStartActive(now)) {
  return eligibleFounder || !headStart ? now : new Date(now.getTime() - FOUNDING.opportunityHeadStartHours * 3_600_000);
}
