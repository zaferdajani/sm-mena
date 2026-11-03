// Consent for optional analytics (Google Analytics). Nothing is loaded and no request is made to Google
// until the visitor presses Accept; the choice is kept in this browser only (PDPL art. 5, GDPR art. 7, ePrivacy).

export const ANALYTICS_KEY = "sawwiq_analytics_consent";
export const ANALYTICS_EVENT = "sawwiq:analytics-consent";

export type AnalyticsChoice = "accepted" | "rejected" | null;

/** A Google Analytics 4 measurement id, or null when none is configured or it looks wrong. */
export function gaMeasurementId(raw: string | undefined): string | null {
  const id = raw?.trim();
  return id && /^G-[A-Z0-9]{4,20}$/.test(id) ? id : null;
}

export function parseChoice(value: string | null | undefined): AnalyticsChoice {
  return value === "accepted" || value === "rejected" ? value : null;
}

/** Whether the analytics script may be loaded: only with a configured id and an explicit "accepted". */
export function mayLoadAnalytics(id: string | null, choice: AnalyticsChoice): boolean {
  return id !== null && choice === "accepted";
}

export const gaScriptUrl = (id: string) => `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
