// Calendar dates in a named time zone, without a date library. Availability
// and inquiries are typed as local dates (YYYY-MM-DD) in the provider's zone
// and stored as UTC instants, so two providers in Amman and Riyadh compare
// the same moment (docs/48-collaboration-v2.md).

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const isDateString = (s: string) => DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

export function isTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Minutes east of UTC that `tz` is at the given instant. */
export function offsetMinutes(tz: string, at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(at);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** The instant when local midnight of `date` starts in `tz` (start of that day). */
export function startOfDayIn(date: string, tz: string): Date {
  const m = DATE.exec(date);
  if (!m) throw new Error("bad date");
  const guess = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Two passes handle a zone whose offset changes on that day.
  let t = guess - offsetMinutes(tz, new Date(guess)) * 60_000;
  t = guess - offsetMinutes(tz, new Date(t)) * 60_000;
  return new Date(t);
}

/** The instant just after the last moment of `date` in `tz` (exclusive end). */
export function endOfDayIn(date: string, tz: string): Date {
  const start = startOfDayIn(date, tz);
  const next = new Date(start.getTime() + 36 * 3600_000);
  return startOfDayIn(dateIn(next, tz), tz);
}

/** The YYYY-MM-DD calendar date of an instant in `tz`. */
export function dateIn(at: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at);
  const v = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${v("year")}-${v("month")}-${v("day")}`;
}

/** A closed date range typed in `tz`, as a half-open UTC interval. */
export function rangeIn(from: string, to: string, tz: string) {
  return { start: startOfDayIn(from, tz), end: endOfDayIn(to, tz) };
}

export const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);
