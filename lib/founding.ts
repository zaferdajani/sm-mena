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
  benefitDays: 90,
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
