import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  bigserial,
  check,
  real,
  serial,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
// agency = an agency account. The rest are staff (lib/auth/permissions.ts):
// owner (the platform owner; cannot be removed by anyone else), admin, and
// scoped team roles for engineering (backbone), maintenance and support.
export const userRole = pgEnum("user_role", ["agency", "admin", "owner", "backbone", "maintenance", "support"]);
// deactivated: the account holder closed it (or the demo cleanup did); hidden
// everywhere and sign-in is off, but its contracts and ledger stay (docs/32).
export const agencyStatus = pgEnum("agency_status", ["active", "suspended", "deactivated"]);
export const planId = pgEnum("plan_id", ["free", "pro", "business"]);
// agency: a company or team; freelancer: one person (photographer, videographer, designer, creator…).
export const agencyKind = pgEnum("agency_kind", ["agency", "freelancer"]);
export const serviceTagStatus = pgEnum("service_tag_status", ["approved", "pending", "rejected"]);
export const partnerRequestStatus = pgEnum("partner_request_status", ["pending", "accepted", "declined", "cancelled"]);
export const postStatus = pgEnum("post_status", ["published", "hidden"]);
export const inquiryStatus = pgEnum("inquiry_status", ["new", "read", "archived"]);
export const reportStatus = pgEnum("report_status", ["open", "resolved", "dismissed"]);
export const reportReason = pgEnum("report_reason", [
  "spam",
  "stolen_work",
  "misleading",
  "inappropriate",
  "other",
]);
export const eventType = pgEnum("event_type", [
  "profile_view",
  "post_view",
  "contact_click",
  "inquiry",
  "like",
  "save",
  "follow",
  "promotion_impression",
  "promotion_click",
  "recommended",
  "proposal",
  "ai_chat",
]);
export const contactChannel = pgEnum("contact_channel", [
  "whatsapp",
  "phone",
  "email",
  "website",
  "instagram",
]);
export const promotionPlacement = pgEnum("promotion_placement", ["feed", "strip", "explore"]);
export const promotionStatus = pgEnum("promotion_status", ["active", "paused", "ended"]);
export const reviewStatus = pgEnum("review_status", ["published", "hidden"]);
// contract = invited after a completed, paid Sawwiq contract (docs/14): the only
// source that may be labelled "Completed project (via Sawwiq)".
export const reviewSource = pgEnum("review_source", ["invite", "inquiry", "contract"]);
export const billing = pgEnum("billing", ["monthly", "one_off"]);
export const requestStatus = pgEnum("request_status", ["open", "closed"]);
export const proposalStatus = pgEnum("proposal_status", ["sent", "shortlisted", "accepted", "declined"]);
export const paymentStatus = pgEnum("payment_status", ["pending", "paid", "failed", "refunded", "cancelled"]);
export const paymentKind = pgEnum("payment_kind", ["subscription", "promotion"]);
export const errorStatus = pgEnum("error_status", ["open", "investigating", "fixed", "wont_fix", "cannot_reproduce"]);
export const supportStatus = pgEnum("support_status", ["new", "planned", "done", "declined"]);
export const supportKind = pgEnum("support_kind", ["bug", "question", "suggestion"]);
export const contractStatus = pgEnum("contract_status", ["sent", "active", "completed", "cancelled", "disputed"]);
export const paymentMode = pgEnum("payment_mode", ["protected", "direct"]);
// split = settled by a dispute decision or a mutual cancellation: part paid out, part refunded.
export const milestoneStatus = pgEnum("milestone_status", ["pending", "funded", "submitted", "changes_requested", "approved", "released", "refunded", "cancelled", "split"]);
export const disputeStatus = pgEnum("dispute_status", ["open", "decided", "appealed", "final", "closed"]);
export const ledgerType = pgEnum("ledger_type", ["deposit", "release", "refund", "fee"]);

export type DeliverableLine = { key: string; quantity: number; platform?: string | null };
// An agency's text in its other language (the main text is in `agencies.content_lang`).
// Empty or missing values fall back to the main text (lib/content-lang.ts).
export type AgencyTranslation = { name?: string; bio?: string; about?: string; strengths?: string[] };
export type PostTranslation = { caption?: string; result?: string };
export type ClientTranslation = { name?: string; description?: string };
export type PackageTranslation = { title?: string; description?: string; deliverables?: string[] };

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("agency"),
  // PDPL: explicit consent, versioned (docs/08-legal-compliance.md)
  consentVersion: text("consent_version").notNull(),
  consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
  // Two-factor authentication (TOTP). Secrets are AES-GCM encrypted with
  // MFA_ENCRYPTION_KEY; backup codes are stored as sha256 hashes.
  totpSecretEnc: text("totp_secret_enc"),
  totpPendingEnc: text("totp_pending_enc"),
  totpEnabledAt: timestamp("totp_enabled_at", { withTimezone: true }),
  totpLastStep: integer("totp_last_step").notNull().default(0), // replay protection
  backupCodeHashes: jsonb("backup_code_hashes").$type<string[]>().notNull().default([]),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  // Staff access control: time-boxed access for contractors, instant disable.
  staffExpiresAt: timestamp("staff_expires_at", { withTimezone: true }),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  invitedBy: uuid("invited_by"),
  createdAt: createdAt(),
});

/** Single-use invitations to join the staff with a given role (owner only). */
export const staffInvites = pgTable(
  "staff_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    role: userRole("role").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    accessUntil: timestamp("access_until", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdBy: uuid("created_by").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("staff_invites_email_idx").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    // sha256 of the cookie token; the raw token is never stored
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // Password accepted but the two-factor code is still owed: the session
    // grants nothing until it is verified.
    mfaPending: boolean("mfa_pending").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Agencies (the only public profiles)
// ---------------------------------------------------------------------------
export const agencies = pgTable(
  "agencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    handle: text("handle").notNull().unique(),
    name: text("name").notNull(),
    bio: text("bio").notNull().default(""),
    avatarKey: text("avatar_key"),
    // Country code (lib/countries.ts); prices are in this country's currency.
    country: text("country").notNull().default("jo"),
    city: text("city").notNull(),
    kind: agencyKind("kind").notNull().default("agency"),
    // Services typed in that aren't tags yet: ids of pending service_tags, until an admin reviews them.
    pendingServices: integer("pending_services").array().notNull().default(sql`'{}'::integer[]`),
    // Roles the team has in house (a freelancer: the roles they do), and roles it looks for partners for (docs/30).
    teamRoles: text("team_roles").array().notNull().default(sql`'{}'::text[]`),
    seeksRoles: text("seeks_roles").array().notNull().default(sql`'{}'::text[]`),
    // Other countries the agency takes clients in (it is listed there too, with a "based in" note).
    servesCountries: text("serves_countries").array().notNull().default(sql`'{}'::text[]`),
    // Longer introduction (About tab) and short strengths, beside the one-line bio.
    about: text("about").notNull().default(""),
    strengths: text("strengths").array().notNull().default(sql`'{}'::text[]`),
    services: text("services").array().notNull().default(sql`'{}'::text[]`),
    platforms: text("platforms").array().notNull().default(sql`'{}'::text[]`),
    industries: text("industries").array().notNull().default(sql`'{}'::text[]`),
    languages: text("languages").array().notNull().default(sql`'{ar}'::text[]`),
    // Language the agency writes its page in; `translation` holds the same text in the other one (lib/content-lang.ts).
    contentLang: text("content_lang").notNull().default("ar"),
    translation: jsonb("translation").$type<AgencyTranslation>().notNull().default({}),
    startingPriceJod: integer("starting_price_jod"),
    whatsapp: text("whatsapp"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    instagram: text("instagram"),
    foundedYear: integer("founded_year"),
    teamSize: text("team_size"),
    isVerified: boolean("is_verified").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    status: agencyStatus("status").notNull().default("active"),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    deactivationReason: text("deactivation_reason"), // self | admin | demo_cleanup
    plan: planId("plan").notNull().default("free"),
    planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
    followerCount: integer("follower_count").notNull().default(0),
    postCount: integer("post_count").notNull().default(0),
    // client reviews on Sawwiq (sum of overall ratings / number of reviews)
    ratingSum: integer("rating_sum").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    // Google Business Profile (Places API); refreshed periodically
    googlePlaceId: text("google_place_id"),
    googleMapsUrl: text("google_maps_url"),
    googleRating: real("google_rating"),
    googleRatingCount: integer("google_rating_count"),
    googleFetchedAt: timestamp("google_fetched_at", { withTimezone: true }),
    // lowercase, Arabic-normalised name + handle + bio for search
    searchText: text("search_text").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("agencies_city_idx").on(t.city),
    index("agencies_services_idx").using("gin", t.services),
    index("agencies_status_idx").on(t.status),
  ],
);

// ---------------------------------------------------------------------------
// Posts (pieces of work) and their images
// ---------------------------------------------------------------------------
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    caption: text("caption").notNull().default(""),
    services: text("services").array().notNull().default(sql`'{}'::text[]`),
    platforms: text("platforms").array().notNull().default(sql`'{}'::text[]`),
    industry: text("industry"),
    result: text("result"),
    // Caption and result in the agency's other language (lib/content-lang.ts).
    translation: jsonb("translation").$type<PostTranslation>().notNull().default({}),
    // The client business this work was for (portfolio groups work by client).
    clientId: uuid("client_id").references((): AnyPgColumn => portfolioClients.id, { onDelete: "set null" }),
    status: postStatus("status").notNull().default("published"),
    likeCount: integer("like_count").notNull().default(0),
    saveCount: integer("save_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    pinnedAt: timestamp("pinned_at", { withTimezone: true }),
    searchText: text("search_text").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [
    index("posts_feed_idx").on(t.status, t.createdAt, t.id),
    index("posts_agency_idx").on(t.agencyId, t.createdAt),
    index("posts_services_idx").using("gin", t.services),
    index("posts_platforms_idx").using("gin", t.platforms),
  ],
);

// A client business in an agency's portfolio, with the accounts the agency
// runs for it (Instagram, TikTok, website, …). Posts can be tagged with it.
export type ClientLink = { kind: string; value: string };
export const portfolioClients = pgTable(
  "portfolio_clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    industry: text("industry"),
    country: text("country"),
    description: text("description").notNull().default(""),
    translation: jsonb("translation").$type<ClientTranslation>().notNull().default({}),
    links: jsonb("links").$type<ClientLink[]>().notNull().default([]),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("portfolio_clients_agency_idx").on(t.agencyId, t.position)],
);

export const postImages = pgTable(
  "post_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    key: text("key").notNull(),
    thumbKey: text("thumb_key").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    // dominant colour, shown while the image loads
    color: text("color").notNull().default("#e5e7eb"),
    alt: text("alt").notNull().default(""),
  },
  (t) => [uniqueIndex("post_images_order_idx").on(t.postId, t.position)],
);

// ---------------------------------------------------------------------------
// Visitor interactions (anonymous visitor id from the sw_vid cookie)
// ---------------------------------------------------------------------------
export const likes = pgTable(
  "likes",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.visitorId] })],
);

export const saves = pgTable(
  "saves",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.visitorId] }),
    index("saves_visitor_idx").on(t.visitorId, t.createdAt),
  ],
);

export const follows = pgTable(
  "follows",
  {
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.agencyId, t.visitorId] }),
    index("follows_visitor_idx").on(t.visitorId, t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    businessName: text("business_name"),
    service: text("service"),
    message: text("message").notNull(),
    visitorId: text("visitor_id"),
    status: inquiryStatus("status").notNull().default("new"),
    consentVersion: text("consent_version").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("inquiries_agency_idx").on(t.agencyId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Measurement: the basis for insights and, later, pricing
// ---------------------------------------------------------------------------
export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    type: eventType("type").notNull(),
    agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "set null" }),
    promotionId: uuid("promotion_id"),
    channel: contactChannel("channel"),
    visitorId: text("visitor_id"),
    detail: text("detail"), // e.g. AI provider for ai_chat
    createdAt: createdAt(),
  },
  (t) => [
    index("events_type_idx").on(t.type, t.createdAt),
    index("events_agency_idx").on(t.agencyId, t.type, t.createdAt),
    index("events_dedupe_idx").on(t.visitorId, t.type, t.postId, t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }),
    reason: reportReason("reason").notNull(),
    details: text("details").notNull().default(""),
    visitorId: text("visitor_id"),
    status: reportStatus("status").notNull().default("open"),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("reports_status_idx").on(t.status, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Monetization (docs/10-monetization.md). Free pilot now; paid later.
// ---------------------------------------------------------------------------
export const promotions = pgTable(
  "promotions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    placement: promotionPlacement("placement").notNull(),
    // optional targeting for explore placements
    service: text("service"),
    city: text("city"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: promotionStatus("status").notNull().default("active"),
    note: text("note").notNull().default(""),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("promotions_active_idx").on(t.placement, t.status, t.startsAt, t.endsAt)],
);

// ---------------------------------------------------------------------------
// Reviews (Airbnb-style: only real clients, via an invite link from the agency
// or after contacting the agency through Sawwiq)
// ---------------------------------------------------------------------------
export const reviewRequests = pgTable(
  "review_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    // sha256 of the link token
    tokenHash: text("token_hash").notNull().unique(),
    clientName: text("client_name").notNull().default(""),
    // Set when Sawwiq invited the client after a completed, paid contract. The
    // token is kept sealed so the client can find the link on the contract page.
    contractId: uuid("contract_id")
      .unique()
      .references((): AnyPgColumn => contracts.id, { onDelete: "set null" }),
    tokenEnc: text("token_enc"),
    usedAt: timestamp("used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("review_requests_agency_idx").on(t.agencyId, t.createdAt)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    requestId: uuid("request_id").unique().references(() => reviewRequests.id, { onDelete: "set null" }),
    source: reviewSource("source").notNull(),
    // The completed, paid contract behind a "contract" review (one review per contract).
    contractId: uuid("contract_id")
      .unique()
      .references((): AnyPgColumn => contracts.id, { onDelete: "set null" }),
    rating: integer("rating").notNull(),
    quality: integer("quality"),
    communication: integer("communication"),
    value: integer("value"),
    timeliness: integer("timeliness"),
    results: integer("results"), // results against the agreed targets
    body: text("body").notNull(),
    reviewerName: text("reviewer_name").notNull(),
    reviewerBusiness: text("reviewer_business"),
    service: text("service"),
    visitorId: text("visitor_id"),
    status: reviewStatus("status").notNull().default("published"),
    reply: text("reply"),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    consentVersion: text("consent_version").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("reviews_agency_idx").on(t.agencyId, t.status, t.createdAt),
    uniqueIndex("reviews_visitor_agency_idx").on(t.agencyId, t.visitorId),
  ],
);

// ---------------------------------------------------------------------------
// Portfolio: fixed-price service packages
// ---------------------------------------------------------------------------
export const packages = pgTable(
  "packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    service: text("service").notNull(),
    priceJod: integer("price_jod").notNull(),
    billing: billing("billing").notNull().default("monthly"),
    deliverables: text("deliverables").array().notNull().default(sql`'{}'::text[]`),
    translation: jsonb("translation").$type<PackageTranslation>().notNull().default({}),
    // Structured contents: [{ key: "reels", quantity: 12, platform: "instagram" }] (lib/deliverables.ts)
    items: jsonb("items").$type<DeliverableLine[]>().notNull().default([]),
    deliveryDays: integer("delivery_days"),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("packages_agency_idx").on(t.agencyId, t.position), index("packages_service_idx").on(t.service, t.priceJod)],
);

// ---------------------------------------------------------------------------
// Project requests and proposals (posted by clients, often via the AI matchmaker)
// ---------------------------------------------------------------------------
export const projectRequests = pgTable(
  "project_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // sha256 of the client's private link token
    tokenHash: text("token_hash").notNull().unique(),
    clientName: text("client_name").notNull(),
    phone: text("phone").notNull(),
    businessName: text("business_name"),
    businessType: text("business_type"),
    services: text("services").array().notNull().default(sql`'{}'::text[]`),
    platforms: text("platforms").array().notNull().default(sql`'{}'::text[]`),
    country: text("country").notNull().default("jo"),
    city: text("city"),
    budgetMinJod: integer("budget_min_jod"),
    budgetMaxJod: integer("budget_max_jod"),
    timeline: text("timeline"),
    description: text("description").notNull(),
    // One accountable team for content, ads and branding ("A to Z").
    fullService: boolean("full_service").notNull().default(false),
    // The brands or businesses the project covers, e.g. "Accrues (B2B), Neo (online store)".
    brands: text("brands"),
    source: text("source").notNull().default("form"),
    status: requestStatus("status").notNull().default("open"),
    visitorId: text("visitor_id"),
    consentVersion: text("consent_version").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("project_requests_open_idx").on(t.status, t.createdAt), index("project_requests_services_idx").using("gin", t.services)],
);

export const requestMatches = pgTable(
  "request_matches",
  {
    requestId: uuid("request_id")
      .notNull()
      .references(() => projectRequests.id, { onDelete: "cascade" }),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    invited: boolean("invited").notNull().default(false),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.requestId, t.agencyId] }), index("request_matches_agency_idx").on(t.agencyId, t.createdAt)],
);

export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => projectRequests.id, { onDelete: "cascade" }),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    priceJod: integer("price_jod").notNull(),
    billing: billing("billing").notNull().default("monthly"),
    timeline: text("timeline").notNull(),
    message: text("message").notNull(),
    status: proposalStatus("status").notNull().default("sent"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("proposals_request_agency_idx").on(t.requestId, t.agencyId), index("proposals_agency_idx").on(t.agencyId, t.createdAt)],
);

export const auditLogs = pgTable("audit_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  meta: jsonb("meta").notNull().default({}),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Payments (subscriptions and promotions). Amounts are in fils (1 JOD = 1000).
// ---------------------------------------------------------------------------
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Financial records outlive the agency, so keep a name snapshot.
    agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "set null" }),
    agencyName: text("agency_name").notNull(),
    kind: paymentKind("kind").notNull(),
    plan: planId("plan"),
    months: integer("months"),
    promotionId: uuid("promotion_id"),
    amountFils: integer("amount_fils").notNull(),
    currency: text("currency").notNull().default("JOD"),
    status: paymentStatus("status").notNull().default("pending"),
    provider: text("provider").notNull(), // mock | manual | (hyperpay, …)
    method: text("method").notNull(), // card | cliq | bank_transfer | cash
    providerRef: text("provider_ref"),
    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    refundReason: text("refund_reason"),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_status_idx").on(t.status, t.createdAt), index("payments_agency_idx").on(t.agencyId), index("payments_paid_idx").on(t.paidAt)],
);

/** Provider notifications (webhooks), stored once per provider event id. */
export const paymentEvents = pgTable(
  "payment_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("payment_events_unique").on(t.provider, t.eventId)],
);

// ---------------------------------------------------------------------------
// Contracts, milestones and protected (escrow) payments
// ---------------------------------------------------------------------------
export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: text("number").notNull().unique(), // SW-2026-4F7K2
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "restrict" }),
    requestId: uuid("request_id").references(() => projectRequests.id, { onDelete: "set null" }),
    proposalId: uuid("proposal_id").references(() => proposals.id, { onDelete: "set null" }),
    packageId: uuid("package_id").references(() => packages.id, { onDelete: "set null" }),
    locale: text("locale").notNull().default("ar"),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    items: jsonb("items").$type<DeliverableLine[]>().notNull().default([]),
    specialRequests: jsonb("special_requests").$type<string[]>().notNull().default([]),
    startDate: text("start_date").notNull(), // YYYY-MM-DD
    endDate: text("end_date").notNull(),
    totalFils: integer("total_fils").notNull(), // thousandths of `currency`
    currency: text("currency").notNull().default("JOD"),
    feePercent: real("fee_percent").notNull().default(0),
    paymentMode: paymentMode("payment_mode").notNull(),
    nda: boolean("nda").notNull().default(false),
    ndaExtra: text("nda_extra"),
    // Terms v2 (docs/20-client-voice.md): measurable targets, a reporting
    // rhythm the agency commits to, and the monthly ad budget the client pays
    // the platforms directly (never part of the agency's fee). v2 contracts
    // also carry the account-ownership and no-surprise-charges clauses.
    termsVersion: integer("terms_version").notNull().default(1),
    kpis: jsonb("kpis").$type<{ label: string; target: string }[]>().notNull().default([]),
    reportingCadence: text("reporting_cadence"), // weekly | biweekly | monthly
    mediaBudgetJod: integer("media_budget_jod"),
    status: contractStatus("status").notNull().default("sent"),
    // Client (no account needed): reached through a private link
    clientName: text("client_name").notNull(),
    clientPhone: text("client_phone").notNull(),
    clientEmail: text("client_email"),
    clientTokenHash: text("client_token_hash").notNull().unique(),
    // Same token, encrypted, so the agency can copy the client's link again.
    clientTokenEnc: text("client_token_enc").notNull(),
    // Signatures: typed full name over the exact terms (sha256), with time and a hashed IP
    termsHash: text("terms_hash").notNull(),
    agencySignerName: text("agency_signer_name").notNull(),
    agencySignedAt: timestamp("agency_signed_at", { withTimezone: true }).notNull(),
    clientSignerName: text("client_signer_name"),
    clientSignedAt: timestamp("client_signed_at", { withTimezone: true }),
    clientSignIpHash: text("client_sign_ip_hash"),
    // Terms v3 (docs/22-legal-documents.md): the universal general conditions
    // (version `legalVersion`), the law and courts of the agency's country,
    // both parties' legal identity, each side's special conditions, and a
    // drawn signature from each signer (PNG, base64). Signatures are
    // fill-once: a database trigger refuses to change them once set.
    jurisdiction: text("jurisdiction"),
    jurisdictionCity: text("jurisdiction_city"),
    legalVersion: text("legal_version"),
    agencyLegalName: text("agency_legal_name"),
    agencyRegNumber: text("agency_reg_number"),
    clientRegNumber: text("client_reg_number"),
    agencyTerms: text("agency_terms"),
    clientTerms: text("client_terms"),
    ndaYears: integer("nda_years"),
    // Terms v4 (docs/14-contracts-and-milestones.md): days the client has to
    // review a delivery before it counts as accepted, rounds of changes each
    // milestone includes, and whether protected payments ran through Sawwiq's
    // licensed payment partner (live) or the test checkout when it was sent.
    reviewDays: integer("review_days").notNull().default(7),
    revisionRounds: integer("revision_rounds").notNull().default(2),
    paymentsLive: boolean("payments_live").notNull().default(false),
    // Partner contracts: the agency buying the work (it acts as the client,
    // signed in to its studio instead of using the private link).
    clientAgencyId: uuid("client_agency_id").references((): AnyPgColumn => agencies.id, { onDelete: "set null" }),
    // The client's device (visitor cookie) once it signed, for in-app notifications.
    clientVisitorId: text("client_visitor_id"),
    agencySignature: text("agency_signature"),
    agencySignIpHash: text("agency_sign_ip_hash"),
    clientSignature: text("client_signature"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contracts_agency_idx").on(t.agencyId, t.createdAt), index("contracts_status_idx").on(t.status), index("contracts_client_agency_idx").on(t.clientAgencyId)],
);

export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    dueDate: text("due_date").notNull(),
    amountFils: integer("amount_fils").notNull(),
    status: milestoneStatus("status").notNull().default("pending"),
    submissionNote: text("submission_note"),
    changesNote: text("changes_note"),
    clientPaidDirect: boolean("client_paid_direct").notNull().default(false), // direct mode: client says it paid
    agencyConfirmedPaid: boolean("agency_confirmed_paid").notNull().default(false),
    fundedAt: timestamp("funded_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    // Acceptance deadline for the current delivery; reminders sent for it (0, 1 = two days left, 2 = one day left).
    reviewDueAt: timestamp("review_due_at", { withTimezone: true }),
    remindersSent: integer("reminders_sent").notNull().default(0),
    // Rounds of "request changes" used, and extra free rounds the agency granted.
    changeRounds: integer("change_rounds").notNull().default(0),
    extraRounds: integer("extra_rounds").notNull().default(0),
    extraRoundAskedAt: timestamp("extra_round_asked_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: text("approved_by"), // client | deadline | admin
    releasedAt: timestamp("released_at", { withTimezone: true }),
  },
  (t) => [index("milestones_contract_idx").on(t.contractId, t.position), index("milestones_review_due_idx").on(t.status, t.reviewDueAt)],
);

/** What must be done in a milestone: deliverables and the client's special requests. */
export const milestoneChecks = pgTable(
  "milestone_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    milestoneId: uuid("milestone_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    text: text("text").notNull(),
    source: text("source").notNull(), // deliverable | special_request
    doneByAgency: boolean("done_by_agency").notNull().default(false),
    confirmedByClient: boolean("confirmed_by_client").notNull().default(false),
  },
  (t) => [index("milestone_checks_idx").on(t.milestoneId, t.position)],
);

/** Money movements for protected contracts. Held = deposits − releases − refunds. */
export const escrowLedger = pgTable(
  "escrow_ledger",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "restrict" }),
    milestoneId: uuid("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
    type: ledgerType("type").notNull(),
    amountFils: integer("amount_fils").notNull(),
    status: text("status").notNull().default("succeeded"), // pending | succeeded | failed
    provider: text("provider").notNull(),
    providerRef: text("provider_ref"),
    note: text("note"),
    // One deposit, one payout, one fee and one refund per milestone at most
    // ("dep:<milestone>", "rel:…", "fee:…", "ref:…"): a replayed event or a
    // double click can't move money twice. Rows are append-only (trigger).
    idemKey: text("idem_key").unique(),
    // Test-mode money (the built-in test checkout): kept forever as a record
    // that the flow ran, never counted as real money. Derived, so it can't drift.
    test: boolean("test").generatedAlwaysAs(sql`provider = 'mock'`).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("escrow_contract_idx").on(t.contractId), index("escrow_type_idx").on(t.type, t.createdAt)],
);

/** Contract timeline: who did what, shown to both sides and to admins in disputes. */
export const contractEvents = pgTable(
  "contract_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    actor: text("actor").notNull(), // agency | client | admin | system
    type: text("type").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("contract_events_idx").on(t.contractId, t.createdAt)],
);

export const changeStatus = pgEnum("change_status", ["pending", "accepted", "declined", "withdrawn"]);

/**
 * Extra work or money after signing. An agency can't charge more on its own:
 * it asks here, and only the client's approval adds the new milestone.
 */
export const contractChanges = pgTable(
  "contract_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    reason: text("reason").notNull(),
    amountFils: integer("amount_fils").notNull(),
    dueDate: text("due_date").notNull(),
    checks: jsonb("checks").$type<string[]>().notNull().default([]),
    status: changeStatus("status").notNull().default("pending"),
    decidedBy: text("decided_by"), // client's typed name when accepted or declined
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    milestoneId: uuid("milestone_id"),
    createdAt: createdAt(),
  },
  (t) => [index("contract_changes_idx").on(t.contractId, t.createdAt)],
);

/**
 * A problem reported on one milestone (docs/14). Both sides add evidence; an
 * admin decides release, refund or a split with a written reason; either side
 * may appeal once within 7 days, then an admin's decision is final. Money
 * moves only when a decision is final (appeal window over, both sides
 * accepted it, or decided on appeal).
 */
export const milestoneDisputes = pgTable(
  "milestone_disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    milestoneId: uuid("milestone_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    openedBy: text("opened_by").notNull(), // agency | client
    statement: text("statement").notNull(),
    status: disputeStatus("status").notNull().default("open"),
    decision: text("decision"), // release | refund | split
    releaseFils: integer("release_fils"),
    refundFils: integer("refund_fils"),
    reason: text("reason"),
    decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    appealDeadline: timestamp("appeal_deadline", { withTimezone: true }),
    agencyAcceptedAt: timestamp("agency_accepted_at", { withTimezone: true }),
    clientAcceptedAt: timestamp("client_accepted_at", { withTimezone: true }),
    appealedBy: text("appealed_by"),
    appealNote: text("appeal_note"),
    appealedAt: timestamp("appealed_at", { withTimezone: true }),
    // The first decision, kept for the record once an appeal replaces it.
    firstDecision: jsonb("first_decision").$type<{ decision: string; releaseFils: number; refundFils: number; reason: string; decidedAt: string } | null>(),
    finalAt: timestamp("final_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("milestone_disputes_contract_idx").on(t.contractId, t.createdAt),
    index("milestone_disputes_status_idx").on(t.status, t.appealDeadline),
    uniqueIndex("milestone_disputes_open_idx").on(t.milestoneId).where(sql`${t.status} in ('open', 'decided', 'appealed')`),
  ],
);

/** Statements, links and notes each side (or an admin) adds to a dispute. Append-only. */
export const disputeEvidence = pgTable(
  "dispute_evidence",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    disputeId: uuid("dispute_id")
      .notNull()
      .references(() => milestoneDisputes.id, { onDelete: "cascade" }),
    side: text("side").notNull(), // agency | client | admin
    body: text("body").notNull(),
    links: text("links").array().notNull().default(sql`'{}'::text[]`),
    createdAt: createdAt(),
  },
  (t) => [index("dispute_evidence_idx").on(t.disputeId, t.createdAt)],
);

/**
 * Mutual cancellation while money is held: one side proposes how each held
 * milestone is settled (paid out / refunded), the other accepts or declines.
 */
export const cancellationProposals = pgTable(
  "cancellation_proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    proposedBy: text("proposed_by").notNull(), // agency | client
    note: text("note").notNull().default(""),
    splits: jsonb("splits").$type<{ milestoneId: string; releaseFils: number; refundFils: number }[]>().notNull().default([]),
    status: text("status").notNull().default("pending"), // pending | accepted | declined | withdrawn
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("cancellation_proposals_idx").on(t.contractId, t.createdAt), uniqueIndex("cancellation_proposals_pending_idx").on(t.contractId).where(sql`${t.status} = 'pending'`)],
);

/**
 * Partner work (docs/30): an agency asks a partner to send it a contract. The
 * partner (who does the work) creates the contract with the asking agency as
 * the client.
 */
export const contractRequests = pgTable(
  "contract_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromAgencyId: uuid("from_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    toAgencyId: uuid("to_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    brief: text("brief").notNull().default(""),
    budgetFils: integer("budget_fils"),
    status: text("status").notNull().default("pending"), // pending | contracted | declined | cancelled
    contractId: uuid("contract_id").references(() => contracts.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [index("contract_requests_to_idx").on(t.toAgencyId, t.status), index("contract_requests_from_idx").on(t.fromAgencyId, t.status)],
);

/**
 * A standalone non-disclosure agreement between an agency and a (future)
 * client, signed the same way as a contract: the agency signs when it sends,
 * the client signs through a private link. Same general conditions, same
 * jurisdiction annex, same fill-once signatures.
 */
export const ndas = pgTable(
  "ndas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: text("number").notNull().unique(), // NDA-2026-4F7K2
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "restrict" }),
    locale: text("locale").notNull().default("ar"),
    direction: text("direction").notNull().default("mutual"), // mutual | client_discloses | agency_discloses
    purpose: text("purpose").notNull(),
    years: integer("years").notNull().default(2),
    jurisdiction: text("jurisdiction").notNull(),
    jurisdictionCity: text("jurisdiction_city").notNull(),
    legalVersion: text("legal_version").notNull(),
    agencyLegalName: text("agency_legal_name").notNull(),
    agencyRegNumber: text("agency_reg_number"),
    agencyTerms: text("agency_terms"),
    clientTerms: text("client_terms"),
    clientName: text("client_name").notNull(),
    clientPhone: text("client_phone").notNull(),
    clientEmail: text("client_email"),
    clientRegNumber: text("client_reg_number"),
    clientTokenHash: text("client_token_hash").notNull().unique(),
    clientTokenEnc: text("client_token_enc").notNull(),
    termsHash: text("terms_hash").notNull(),
    status: text("status").notNull().default("sent"), // sent | signed | declined | cancelled
    agencySignerName: text("agency_signer_name").notNull(),
    agencySignedAt: timestamp("agency_signed_at", { withTimezone: true }).notNull(),
    agencySignature: text("agency_signature").notNull(),
    agencySignIpHash: text("agency_sign_ip_hash"),
    clientSignerName: text("client_signer_name"),
    clientSignedAt: timestamp("client_signed_at", { withTimezone: true }),
    clientSignature: text("client_signature"),
    clientSignIpHash: text("client_sign_ip_hash"),
    /** The client's reason for declining, or the change it asked for before signing. */
    clientNote: text("client_note"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ndas_agency_idx").on(t.agencyId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Bugs: automatic error journal and user-submitted reports
// ---------------------------------------------------------------------------
export const errorEvents = pgTable(
  "error_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    fingerprint: text("fingerprint").notNull(),
    source: text("source").notNull(), // client | server
    kind: text("kind").notNull(),
    message: text("message").notNull(),
    stack: text("stack"),
    path: text("path"),
    userAgent: text("user_agent"),
    occurrences: integer("occurrences").notNull().default(1),
    status: errorStatus("status").notNull().default("open"),
    resolutionNotes: text("resolution_notes"),
    resolutionCommit: text("resolution_commit"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("error_events_fingerprint").on(t.fingerprint), index("error_events_status_idx").on(t.status, t.lastSeenAt)],
);

export const supportRequests = pgTable(
  "support_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: supportKind("kind").notNull(),
    message: text("message").notNull(),
    email: text("email"),
    path: text("path"),
    locale: text("locale"),
    userAgent: text("user_agent"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    visitorId: text("visitor_id"),
    status: supportStatus("status").notNull().default("new"),
    adminNote: text("admin_note"),
    handledBy: uuid("handled_by").references(() => users.id, { onDelete: "set null" }),
    handledAt: timestamp("handled_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("support_status_idx").on(t.status, t.createdAt)],
);

// ---------------------------------------------------------------------------
// First-party traffic statistics (no third-party analytics)
// ---------------------------------------------------------------------------
export const pageViews = pgTable(
  "page_views",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    path: text("path").notNull(),
    source: text("source").notNull(), // utm_source, referrer host or "(direct)"
    visitorId: text("visitor_id"),
    sessionId: text("session_id").notNull(),
    landing: boolean("landing").notNull().default(false),
    device: text("device").notNull(), // mobile | tablet | desktop
    locale: text("locale"),
    timezone: text("timezone"),
    createdAt: createdAt(),
  },
  (t) => [index("page_views_created_idx").on(t.createdAt), index("page_views_session_idx").on(t.sessionId)],
);

/** Admin-editable settings (key → JSON value). */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

// ---------------------------------------------------------------------------
// Chat between clients and agencies (docs/23-chat-and-notifications.md).
// Every message is kept as sent: a database trigger refuses edits and deletes
// (staff can only hide a message), so what staff review in a dispute is exactly
// what was said. Clients have no account: they are the visitor cookie that
// posted the request or inquiry, or whoever holds the request's private link.
// ---------------------------------------------------------------------------
export const conversationStatus = pgEnum("conversation_status", ["open", "closed", "blocked"]);
export const messageSide = pgEnum("message_side", ["client", "agency", "system", "staff"]);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    requestId: uuid("request_id").references(() => projectRequests.id, { onDelete: "set null" }),
    proposalId: uuid("proposal_id").references(() => proposals.id, { onDelete: "set null" }),
    inquiryId: uuid("inquiry_id").references(() => inquiries.id, { onDelete: "set null" }),
    clientVisitorId: text("client_visitor_id"),
    clientName: text("client_name").notNull(), // snapshot; never a phone or email
    status: conversationStatus("status").notNull().default("open"),
    // Version of the "chats are recorded for quality assurance" notice shown.
    noticeVersion: text("notice_version").notNull(),
    lastMessageId: bigint("last_message_id", { mode: "number" }).notNull().default(0),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    agencyLastReadId: bigint("agency_last_read_id", { mode: "number" }).notNull().default(0),
    clientLastReadId: bigint("client_last_read_id", { mode: "number" }).notNull().default(0),
    // Email throttle: at most one "new message" email per conversation per 15 minutes.
    agencyEmailedAt: timestamp("agency_emailed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("conversations_request_agency_idx").on(t.requestId, t.agencyId).where(sql`${t.requestId} is not null`),
    uniqueIndex("conversations_inquiry_idx").on(t.inquiryId).where(sql`${t.inquiryId} is not null`),
    index("conversations_agency_idx").on(t.agencyId, t.lastMessageAt),
    index("conversations_visitor_idx").on(t.clientVisitorId, t.lastMessageAt),
  ],
);

export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    side: messageSide("side").notNull(),
    senderUserId: uuid("sender_user_id").references(() => users.id, { onDelete: "set null" }),
    senderVisitorId: text("sender_visitor_id"),
    body: text("body").notNull(),
    ipHash: text("ip_hash"),
    // Staff moderation only: the text stays in the log, participants see a placeholder.
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    hiddenBy: uuid("hidden_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("conversation_messages_conversation_idx").on(t.conversationId, t.id),
    check("conversation_messages_body_length", sql`char_length(${t.body}) between 1 and 2000`),
  ],
);

/**
 * In-app notifications for an agency (agencyId) or a client device (visitorId).
 * The text is rendered from `kind` + `params` in the reader's language; params
 * never hold a phone number or an email.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id"),
    requestId: uuid("request_id").references(() => projectRequests.id, { onDelete: "set null" }),
    conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
    // message | proposal_received | proposal_accepted | proposal_declined | request_invited | inquiry
    kind: text("kind").notNull(),
    params: jsonb("params").$type<Record<string, string | number>>().notNull().default({}),
    href: text("href").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("notifications_agency_idx").on(t.agencyId, t.readAt, t.createdAt),
    index("notifications_visitor_idx").on(t.visitorId, t.readAt, t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Service tags (docs/30-services-and-partners.md): every service is a numbered
// tag. Built-in ones come from data/service-catalog.json; agencies can type new
// ones, which stay pending until an admin approves, merges or rejects them.
// ---------------------------------------------------------------------------
export const serviceTags = pgTable(
  "service_tags",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    group: text("group").notNull().default("other"),
    // The closest core service (lib/taxonomy.ts) so hire pages and matching find it.
    parent: text("parent"),
    aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
    roles: text("roles").array().notNull().default(sql`'{}'::text[]`),
    status: serviceTagStatus("status").notNull().default("pending"),
    builtin: boolean("builtin").notNull().default(false),
    // What an agency typed, and who, for pending tags.
    proposedText: text("proposed_text"),
    proposedByAgencyId: uuid("proposed_by_agency_id").references(() => agencies.id, { onDelete: "set null" }),
    mergedIntoId: integer("merged_into_id"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    searchText: text("search_text").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("service_tags_status_idx").on(t.status)],
);

// One agency asking another (or a freelancer) to work together on what it lacks.
export const partnerRequests = pgTable(
  "partner_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromAgencyId: uuid("from_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    toAgencyId: uuid("to_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    roles: text("roles").array().notNull().default(sql`'{}'::text[]`),
    message: text("message").notNull().default(""),
    status: partnerRequestStatus("status").notNull().default("pending"),
    createdAt: createdAt(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [
    index("partner_requests_to_idx").on(t.toAgencyId, t.status),
    index("partner_requests_from_idx").on(t.fromAgencyId, t.status),
    uniqueIndex("partner_requests_open_pair_idx").on(t.fromAgencyId, t.toAgencyId).where(sql`${t.status} = 'pending'`),
  ],
);

export type User = typeof users.$inferSelect;
export type ServiceTag = typeof serviceTags.$inferSelect;
export type PartnerRequest = typeof partnerRequests.$inferSelect;
export type Agency = typeof agencies.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PostImage = typeof postImages.$inferSelect;
export type PortfolioClient = typeof portfolioClients.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
export type Promotion = typeof promotions.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Package = typeof packages.$inferSelect;
export type ProjectRequest = typeof projectRequests.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type ErrorEvent = typeof errorEvents.$inferSelect;
export type SupportRequest = typeof supportRequests.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type MilestoneCheck = typeof milestoneChecks.$inferSelect;
export type ContractChange = typeof contractChanges.$inferSelect;
export type MilestoneDispute = typeof milestoneDisputes.$inferSelect;
export type DisputeEvidence = typeof disputeEvidence.$inferSelect;
export type CancellationProposal = typeof cancellationProposals.$inferSelect;
export type ContractRequest = typeof contractRequests.$inferSelect;
export type EscrowEntry = typeof escrowLedger.$inferSelect;
export type Nda = typeof ndas.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
