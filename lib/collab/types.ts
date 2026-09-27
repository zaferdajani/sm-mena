// Collaboration V2 vocabulary (docs/48-collaboration-v2.md). Browser-safe: no database, no server-only imports.

/** How two providers relate on a piece of work. */
export const COLLAB_MODES = ["private", "disclosed", "referral"] as const;
export type CollabMode = (typeof COLLAB_MODES)[number];

export const WORK_MODES = ["remote", "on_site", "travel"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const AVAILABILITY_STATUSES = ["available", "limited", "busy"] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const CAPACITY_UNITS = ["days", "hours", "projects"] as const;
export const VISIBILITIES = ["private", "partners", "public"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const NEED_STATUSES = ["draft", "published", "withdrawn", "expired", "filled"] as const;
export const INQUIRY_STATUSES = ["draft", "sent", "replied", "converted", "declined", "expired", "withdrawn"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];
export const RECIPIENT_STATUSES = ["sent", "viewed", "quoted", "declined", "accepted", "passed", "expired"] as const;
export const QUOTE_STATUSES = ["open", "superseded", "accepted", "withdrawn", "declined"] as const;
export const RATE_UNITS = ["day", "hour", "project", "month"] as const;

/** Days a confirmation counts as fresh; after that a window "needs confirmation". */
export const AVAILABILITY_FRESH_DAYS = 14;
/** Default life of a published need, an inquiry's response window and an invitation link. */
export const NEED_DAYS = 30;
export const INQUIRY_RESPONSE_DAYS = 7;
export const INVITE_DAYS = 14;
/** A declined invitation or request keeps the pair quiet for this long. */
export const COOLDOWN_DAYS = 30;
/** Per sender, per hour. */
export const INQUIRY_LIMIT = 20;
export const INVITE_LIMIT = 10;
export const MAX_RECIPIENTS = 8;
export const CONSENT_VERSION = "collab-2026-09";
