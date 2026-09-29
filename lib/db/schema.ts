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
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { PostApp } from "@/lib/app-demo";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
// agency = an agency account. The rest are staff (lib/auth/permissions.ts):
// owner (the platform owner; cannot be removed by anyone else), admin, and
// scoped team roles for engineering (backbone), maintenance and support.
// "client": a business owner who signs in with an emailed code to follow, save and like (docs/41).
// "agent": a field marketing agent who brings agencies and freelancers to Sawwiq (docs/42).
export const userRole = pgEnum("user_role", ["agency", "admin", "owner", "backbone", "maintenance", "support", "client", "agent"]);
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

/**
 * One-time sign-in codes sent by email (docs/41-client-accounts.md). Only a
 * hash of the code is stored; codes expire after 10 minutes and allow five
 * tries. Rows are deleted after a day.
 */
export const loginCodes = pgTable(
  "login_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("login_codes_email_idx").on(t.email, t.createdAt)],
);

/**
 * Field marketing agents who bring agencies and freelancers to Sawwiq
 * (docs/42-referral-agents.md). Each has a personal code and link; a provider
 * who signs up with it is theirs. An agent earns `rateFils` for each referred
 * provider that becomes active, plus tier bonuses. Sawwiq records what is owed
 * and what was paid; money itself is paid outside the platform.
 */
export const referralAgents = pgTable(
  "referral_agents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    phone: text("phone"),
    rateFils: integer("rate_fils").notNull().default(5000),
    currency: text("currency").notNull().default("JOD"),
    active: boolean("active").notNull().default(true),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
);
export type ReferralAgent = typeof referralAgents.$inferSelect;

/** Payouts recorded for agents (paid outside Sawwiq); append-only. */
export const referralPayouts = pgTable(
  "referral_payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => referralAgents.id, { onDelete: "restrict" }),
    amountFils: integer("amount_fils").notNull(),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("referral_payouts_agent_idx").on(t.agentId, t.createdAt)],
);

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

// Founding seat numbers only go up, so a number never comes back (docs/39).
export const foundingSeatSeq = pgSequence("founding_seat_seq");

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
    // The marketing agent who brought this provider (docs/42), and why an admin voided it, if they did.
    referredByAgentId: uuid("referred_by_agent_id"),
    referralVoidReason: text("referral_void_reason"),
    // Founding seat: 1, 2, 3… in the order real providers joined; never reused (docs/39).
    foundingSeat: integer("founding_seat").unique(),
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
    // The app this post shows, with its "Try the app" sandbox link (lib/app-demo.ts).
    app: jsonb("app").$type<PostApp | null>(),
    // Where the work was imported from (a Behance project link, docs/47); shown as credit on the post.
    sourceUrl: text("source_url"),
    // A work sample imported through a creator's own platform connection (docs/53): the
    // provider and its stable item id (one post per item and agency), and the official
    // player shown on the post. Provider-derived; removed when the connection is.
    sourceProvider: text("source_provider"),
    sourceItemId: text("source_item_id"),
    embed: jsonb("embed").$type<PostEmbed | null>(),
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
    uniqueIndex("posts_source_item_idx").on(t.agencyId, t.sourceProvider, t.sourceItemId).where(sql`source_item_id is not null`),
  ],
);

/** The official player for an imported work sample (lib/social/embed.ts builds and checks it). */
export type PostEmbed = { provider: "youtube" | "tiktok" | "instagram" | "facebook"; itemId: string; url: string };

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
    // The account's logo (a square WebP in storage, like an agency avatar).
    logoKey: text("logo_key"),
    // The client confirmed that this agency runs its account (docs/28): a private link the agency sends.
    confirmToken: text("confirm_token"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
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
    // Founder economics (docs/45): true on the one live, Sawwiq-acquired,
    // protected contract that carries the first-project 0% platform fee. A
    // partial unique index lets an agency hold at most one such contract that
    // is not cancelled, so two contracts created at the same moment can never
    // both get the waiver; cancelling the holder frees it (signed terms stay).
    founderWaiver: boolean("founder_waiver").notNull().default(false),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("contracts_agency_idx").on(t.agencyId, t.createdAt),
    index("contracts_status_idx").on(t.status),
    index("contracts_client_agency_idx").on(t.clientAgencyId),
    uniqueIndex("contracts_founder_waiver_idx").on(t.agencyId).where(sql`${t.founderWaiver} and ${t.status} <> 'cancelled'`),
  ],
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
    // Who a payout goes to: null = the contract's agency; a partner who
    // delivered a share of the milestone otherwise ("prel:…"/"pfee:…"; docs/40).
    payeeAgencyId: uuid("payee_agency_id").references(() => agencies.id, { onDelete: "restrict" }),
    // Test-mode money (the built-in test checkout): kept forever as a record
    // that the flow ran, never counted as real money. Derived, so it can't drift.
    test: boolean("test").generatedAlwaysAs(sql`provider = 'mock'`).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("escrow_contract_idx").on(t.contractId), index("escrow_type_idx").on(t.type, t.createdAt)],
);

/**
 * A partner's share of one client milestone (docs/40-collaboration.md): the
 * agency brings in a freelancer or partner agency for that milestone, for a
 * percentage or a fixed amount of it. Agreed between agency and partner and
 * frozen (terms hash) once the partner accepts; the client's own contract
 * terms do not change. When the client confirms the milestone (or its review
 * period ends), settleMilestone pays the share to the partner and the rest
 * to the agency, each less Sawwiq's fee.
 */
export const milestoneShares = pgTable(
  "milestone_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "restrict" }),
    milestoneId: uuid("milestone_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "restrict" }),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "restrict" }),
    partnerAgencyId: uuid("partner_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "restrict" }),
    kind: text("kind").notNull(), // percent | fixed
    percent: integer("percent"),
    amountFils: integer("amount_fils").notNull(),
    note: text("note"),
    status: text("status").notNull().default("proposed"), // proposed | accepted | declined | cancelled
    termsHash: text("terms_hash"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    // Direct payment mode: the agency pays the partner itself and both mark it.
    paidByAgencyAt: timestamp("paid_by_agency_at", { withTimezone: true }),
    receivedByPartnerAt: timestamp("received_by_partner_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    // One live share per milestone.
    uniqueIndex("milestone_shares_live_idx").on(t.milestoneId).where(sql`status in ('proposed', 'accepted')`),
    index("milestone_shares_partner_idx").on(t.partnerAgencyId, t.status),
  ],
);
export type MilestoneShare = typeof milestoneShares.$inferSelect;

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

/**
 * Automatic site checks (docs/52): every run of the scheduled check, what it
 * found and what it closed. Kept 90 days; shown in Admin → Bugs.
 */
// ---------------------------------------------------------------------------
// Creator platform connections (docs/53): consent-based OAuth to a creator's own
// or managed accounts, and reviewed import of published work. Private; never
// sent to the browser, AI or logs. Verified access is not proof of authorship.
// ---------------------------------------------------------------------------
export const socialProvider = pgEnum("social_provider", ["google", "youtube", "instagram", "facebook", "tiktok"]);
export const socialGrantStatus = pgEnum("social_grant_status", ["active", "limited", "expired", "revoked", "revoke_pending", "failed"]);
export const socialResourceStatus = pgEnum("social_resource_status", ["pending", "selected", "removed"]);
export const socialOwnership = pgEnum("social_ownership", ["own", "client"]);
export const socialItemState = pgEnum("social_item_state", ["offered", "draft", "published", "dismissed"]);

/** One authorization attempt: only the state's hash is stored; consumed once, expires in minutes. */
export const socialOauthAttempts = pgTable(
  "social_oauth_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stateHash: text("state_hash").notNull(),
    provider: socialProvider("provider").notNull(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
    // Hash of the browser session that started it: the callback must come back on the same one.
    sessionHash: text("session_hash").notNull(),
    ownership: socialOwnership("ownership").notNull(),
    clientId: uuid("client_id").references((): AnyPgColumn => portfolioClients.id, { onDelete: "set null" }),
    locale: text("locale").notNull(),
    // Where to come back to: the first-run setup or Studio → Connected platforms (a fixed list, never a URL).
    returnTo: text("return_to").notNull().default("connections"),
    // PKCE verifier and OpenID nonce, sealed (lib/social/crypto.ts).
    sealedVerifier: text("sealed_verifier"),
    sealedNonce: text("sealed_nonce"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("social_attempts_state_idx").on(t.stateHash), index("social_attempts_expires_idx").on(t.expiresAt)],
);

/** A provider's consent for one agency: sealed tokens, granted scopes and health. */
export const socialGrants = pgTable(
  "social_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    provider: socialProvider("provider").notNull(),
    // The provider's stable account id for this person (a string; never a JS number).
    providerSubject: text("provider_subject").notNull(),
    scopes: text("scopes").array().notNull().default(sql`'{}'::text[]`),
    sealedAccess: text("sealed_access"),
    sealedRefresh: text("sealed_refresh"),
    keyVersion: integer("key_version").notNull().default(1),
    accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }),
    refreshExpiresAt: timestamp("refresh_expires_at", { withTimezone: true }),
    status: socialGrantStatus("status").notNull().default("active"),
    // Short, safe reason code for the current status (never a provider response).
    statusReason: text("status_reason"),
    consentVersion: text("consent_version").notNull(),
    // Compare-and-swap counter: a token refresh only lands on the version it read.
    version: integer("version").notNull().default(0),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("social_grants_subject_idx").on(t.agencyId, t.provider, t.providerSubject)],
);

/** A channel, Page or account reachable through a grant, which the creator confirmed (or may confirm). */
export const socialResources = pgTable(
  "social_resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    grantId: uuid("grant_id").notNull().references(() => socialGrants.id, { onDelete: "cascade" }),
    agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
    provider: socialProvider("provider").notNull(),
    kind: text("kind").notNull(), // identity | channel | page | account
    providerResourceId: text("provider_resource_id").notNull(),
    displayName: text("display_name").notNull(),
    handle: text("handle"),
    ownership: socialOwnership("ownership").notNull(),
    clientId: uuid("client_id").references((): AnyPgColumn => portfolioClients.id, { onDelete: "set null" }),
    status: socialResourceStatus("status").notNull().default("pending"),
    // A Facebook Page's own token, sealed; other providers read with the grant's token.
    sealedToken: text("sealed_token"),
    pendingExpiresAt: timestamp("pending_expires_at", { withTimezone: true }),
    selectedAt: timestamp("selected_at", { withTimezone: true }),
    metadataFetchedAt: timestamp("metadata_fetched_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("social_resources_provider_idx").on(t.agencyId, t.provider, t.providerResourceId), index("social_resources_grant_idx").on(t.grantId)],
);

/**
 * A published item the creator picked from a connected resource, waiting for
 * review. Bounded metadata only; refreshed or deleted on the provider's schedule
 * (YouTube: 30 days). A draft never shows publicly.
 */
export const socialImportItems = pgTable(
  "social_import_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id").notNull().references(() => socialResources.id, { onDelete: "cascade" }),
    provider: socialProvider("provider").notNull(),
    providerItemId: text("provider_item_id").notNull(),
    mediaKind: text("media_kind").notNull(), // video | image | carousel | post
    title: text("title").notNull().default(""),
    caption: text("caption").notNull().default(""),
    permalink: text("permalink").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    // offered: seen while browsing (purged after a day); draft: picked for review.
    state: socialItemState("state").notNull().default("offered"),
    postId: uuid("post_id").references((): AnyPgColumn => posts.id, { onDelete: "set null" }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("social_items_provider_idx").on(t.agencyId, t.provider, t.providerItemId), index("social_items_fetched_idx").on(t.fetchedAt)],
);

/** Provider API units used per day, kept apart from deletable rows so a quota survives deletions. */
export const socialQuotaUsage = pgTable(
  "social_quota_usage",
  {
    provider: socialProvider("provider").notNull(),
    day: text("day").notNull(), // YYYY-MM-DD (UTC)
    units: integer("units").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.provider, t.day] })],
);

/** A Meta data-deletion request (signed callback): what was removed, looked up by its code. */
export const socialDeletionRequests = pgTable("social_deletion_requests", {
  code: text("code").primaryKey(),
  provider: socialProvider("provider").notNull(),
  grants: integer("grants").notNull().default(0),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// First-run portfolio setup (docs/53): one private, resumable draft per agency.
// Progress is not publication: nothing here is public until the owner publishes.
// ---------------------------------------------------------------------------
export const setupStatus = pgEnum("setup_status", ["in_progress", "paused", "finished"]);
export type SetupDraftData = {
  source?: "upload" | "pdf" | "behance" | "social";
  client?: { mode: "existing" | "personal" | "private"; clientId?: string };
  project?: { title: string; contribution: string; services: string[] };
  /** A Behance project staged by the importer (public source images, read on publish). */
  behance?: { projectUrl: string; images: string[]; publishedAt: string | null; clientSuggestion: string | null };
  /** A connected-platform item staged for this project (social_import_items). */
  socialItemId?: string;
};
export const portfolioSetups = pgTable("portfolio_setups", {
  agencyId: uuid("agency_id").primaryKey().references(() => agencies.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  status: setupStatus("status").notNull().default("in_progress"),
  step: integer("step").notNull().default(1),
  // Optimistic lock: every accepted write names the version it read (stale tabs and retries are refused).
  version: integer("version").notNull().default(0),
  data: jsonb("data").$type<SetupDraftData>().notNull().default({}),
  // The project this setup published or saved; set once, so a repeated Finish cannot create a second one.
  postId: uuid("post_id").references((): AnyPgColumn => posts.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Images staged for the setup project, in private storage (drafts/…); removed on publish or after 60 days. */
export const portfolioSetupMedia = pgTable(
  "portfolio_setup_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    position: integer("position").notNull().default(0),
    source: text("source").notNull(), // upload | pdf
    createdAt: createdAt(),
  },
  (t) => [index("setup_media_agency_idx").on(t.agencyId, t.position)],
);

export const siteChecks = pgTable(
  "site_checks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
    ok: boolean("ok").notNull(),
    failures: integer("failures").notNull().default(0),
    closed: integer("closed").notNull().default(0),
    results: jsonb("results").$type<{ path: string; status: number; ms: number; ok: boolean; problem?: string; finalPath?: string; release?: { revision: string; commit: string | null; environment: string } | null }[]>().notNull().default([]),
  },
  (t) => [index("site_checks_ran_idx").on(t.ranAt)],
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

// ---------------------------------------------------------------------------
// Collaboration V2 (docs/48-collaboration-v2.md): find, book and rehire other
// providers. Everything here is a projection around the signed partner
// contract (contracts.agency_id = supplier, client_agency_id = buyer) and
// the disclosed milestone share; none of it moves money or changes terms.
// ---------------------------------------------------------------------------

/** How a provider likes to collaborate. Absent row = unknown (never assumed). */
export const collabProfiles = pgTable("collab_profiles", {
  agencyId: uuid("agency_id")
    .primaryKey()
    .references(() => agencies.id, { onDelete: "cascade" }),
  // Relationship models the provider accepts: private | disclosed | referral.
  modes: text("modes").array().notNull().default(sql`'{}'::text[]`),
  // remote | on_site | travel
  workModes: text("work_modes").array().notNull().default(sql`'{}'::text[]`),
  // null = not answered; true/false = the provider's explicit choice.
  openToWork: boolean("open_to_work"),
  consentVersion: text("consent_version").notNull().default("collab-2026-09"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A provider's own statement about a period: available, limited or busy,
 * with the capacity it declares in Sawwiq. Stored as UTC instants plus the
 * zone it was typed in. Freshness = confirmedAt/expiresAt; a window nobody
 * confirmed recently reads as "needs confirmation", never as available.
 */
export const availabilityWindows = pgTable(
  "availability_windows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    timezone: text("timezone").notNull().default("Asia/Amman"),
    // available | limited | busy
    status: text("status").notNull().default("available"),
    capacityUnits: integer("capacity_units"),
    // days | hours | projects
    capacityUnit: text("capacity_unit"),
    // private | partners | public. Busy windows never show a counterparty.
    visibility: text("visibility").notNull().default("partners"),
    note: text("note").notNull().default(""),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("availability_windows_agency_idx").on(t.agencyId, t.startsAt), check("availability_windows_order", sql`${t.endsAt} > ${t.startsAt}`)],
);

/** A collaboration need an agency chooses to publish (never derived from seeks_roles). */
export const collabNeeds = pgTable(
  "collab_needs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    roles: text("roles").array().notNull().default(sql`'{}'::text[]`),
    services: text("services").array().notNull().default(sql`'{}'::text[]`),
    scope: text("scope").notNull().default(""),
    // remote | on_site | travel
    workMode: text("work_mode").notNull().default("remote"),
    city: text("city"),
    country: text("country").notNull().default("jo"),
    languages: text("languages").array().notNull().default(sql`'{}'::text[]`),
    startsOn: text("starts_on"), // YYYY-MM-DD
    endsOn: text("ends_on"),
    budgetMinFils: integer("budget_min_fils"),
    budgetMaxFils: integer("budget_max_fils"),
    currency: text("currency").notNull().default("JOD"),
    modes: text("modes").array().notNull().default(sql`'{private}'::text[]`),
    // public (every eligible provider) | partners (accepted partners only)
    audience: text("audience").notNull().default("public"),
    // draft | published | withdrawn | expired | filled
    status: text("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("collab_needs_open_idx").on(t.status, t.country, t.expiresAt), index("collab_needs_agency_idx").on(t.agencyId, t.status)],
);

/** A provider raising a hand on a published need. One per provider and need. */
export const collabNeedReplies = pgTable(
  "collab_need_replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    needId: uuid("need_id")
      .notNull()
      .references(() => collabNeeds.id, { onDelete: "cascade" }),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    note: text("note").notNull().default(""),
    // interested | withdrawn | declined
    status: text("status").notNull().default("interested"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("collab_need_replies_pair_idx").on(t.needId, t.agencyId), index("collab_need_replies_agency_idx").on(t.agencyId)],
);

/**
 * An agency's private roster: providers it keeps close, in its own groups,
 * with notes and a negotiated-rate reference only that agency can read.
 * Saving someone is not a partnership and tells the provider nothing.
 */
export const collabRoster = pgTable(
  "collab_roster",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerAgencyId: uuid("owner_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    providerAgencyId: uuid("provider_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    groupName: text("group_name").notNull().default(""),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    notes: text("notes").notNull().default(""),
    rateFils: integer("rate_fils"),
    rateCurrency: text("rate_currency"),
    // day | hour | project | month
    rateUnit: text("rate_unit"),
    lastEngagedAt: timestamp("last_engaged_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("collab_roster_pair_idx").on(t.ownerAgencyId, t.providerAgencyId), index("collab_roster_owner_idx").on(t.ownerAgencyId, t.groupName)],
);

/**
 * A personal invitation link an agency hands to someone it already works
 * with. Only a hash of the token is stored; the link expires, can be revoked,
 * and accepting it makes the two accepted partners (no duplicate account).
 */
export const collabInvites = pgTable(
  "collab_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromAgencyId: uuid("from_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    // A short label the sender types (a first name or a studio), never contact data.
    label: text("label").notNull().default(""),
    roles: text("roles").array().notNull().default(sql`'{}'::text[]`),
    // pending | accepted | declined | expired | revoked
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAgencyId: uuid("accepted_agency_id").references(() => agencies.id, { onDelete: "set null" }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("collab_invites_from_idx").on(t.fromAgencyId, t.status)],
);

/** A provider that wants nothing from another one: no requests, invites or inquiries get through. */
export const collabBlocks = pgTable(
  "collab_blocks",
  {
    blockerAgencyId: uuid("blocker_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    blockedAgencyId: uuid("blocked_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.blockerAgencyId, t.blockedAgencyId] }), index("collab_blocks_blocked_idx").on(t.blockedAgencyId)],
);

/**
 * A structured work inquiry from a buying agency to chosen suppliers. It is
 * not a contract: replies are interest, a quote or a decline, and accepting a
 * quote hands over to the existing partner-contract request.
 */
export const workInquiries = pgTable(
  "work_inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buyerAgencyId: uuid("buyer_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    needId: uuid("need_id").references(() => collabNeeds.id, { onDelete: "set null" }),
    // The buyer's own client contract this work feeds; private to the buyer, never sent to suppliers.
    parentContractId: uuid("parent_contract_id").references(() => contracts.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    role: text("role").notNull().default(""),
    deliverables: jsonb("deliverables").$type<DeliverableLine[]>().notNull().default([]),
    assetsNote: text("assets_note").notNull().default(""),
    scope: text("scope").notNull().default(""),
    startsOn: text("starts_on"), // YYYY-MM-DD
    dueOn: text("due_on"),
    timezone: text("timezone").notNull().default("Asia/Amman"),
    workMode: text("work_mode").notNull().default("remote"),
    city: text("city"),
    country: text("country").notNull().default("jo"),
    budgetFils: integer("budget_fils"),
    currency: text("currency").notNull().default("JOD"),
    // private (subcontract; the buyer stays the client's face) | disclosed (co-delivery) | referral
    privacyMode: text("privacy_mode").notNull().default("private"),
    responseBy: timestamp("response_by", { withTimezone: true }),
    // draft | sent | replied | converted | declined | expired | withdrawn
    status: text("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    acceptedQuoteId: uuid("accepted_quote_id"),
    contractRequestId: uuid("contract_request_id").references(() => contractRequests.id, { onDelete: "set null" }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("work_inquiries_buyer_idx").on(t.buyerAgencyId, t.status), index("work_inquiries_open_idx").on(t.status, t.responseBy)],
);

/** Who an inquiry was sent to, and where each supplier stands. */
export const workInquiryRecipients = pgTable(
  "work_inquiry_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => workInquiries.id, { onDelete: "cascade" }),
    supplierAgencyId: uuid("supplier_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    // sent | viewed | quoted | declined | accepted | passed (another supplier was chosen) | expired
    status: text("status").notNull().default("sent"),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("work_inquiry_recipients_pair_idx").on(t.inquiryId, t.supplierAgencyId), index("work_inquiry_recipients_supplier_idx").on(t.supplierAgencyId, t.status)],
);

/** A supplier's reply with numbers: each counter is a new version; the buyer sees only its own inquiries' quotes. */
export const workQuotes = pgTable(
  "work_quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => workInquiries.id, { onDelete: "cascade" }),
    supplierAgencyId: uuid("supplier_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    amountFils: integer("amount_fils").notNull(),
    currency: text("currency").notNull().default("JOD"),
    startsOn: text("starts_on"),
    dueOn: text("due_on"),
    scopeNote: text("scope_note").notNull().default(""),
    exclusions: text("exclusions").notNull().default(""),
    // open | superseded | accepted | withdrawn | declined
    status: text("status").notNull().default("open"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("work_quotes_version_idx").on(t.inquiryId, t.supplierAgencyId, t.version), index("work_quotes_inquiry_idx").on(t.inquiryId, t.status)],
);

// ---------------------------------------------------------------------------
// Collaboration V2, release 2 (docs/49-work-orders.md): the delivery workspace
// around an accepted inquiry. It references the signed supplier→buyer
// contract and one of its milestones; it never holds terms or money itself.
// ---------------------------------------------------------------------------

export const workOrders = pgTable(
  "work_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buyerAgencyId: uuid("buyer_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    supplierAgencyId: uuid("supplier_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    inquiryId: uuid("inquiry_id").references(() => workInquiries.id, { onDelete: "set null" }),
    // The authoritative agreement: a contract where agency_id = supplier and client_agency_id = buyer.
    contractId: uuid("contract_id").references(() => contracts.id, { onDelete: "set null" }),
    milestoneId: uuid("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
    // The buyer's own client contract this work feeds; never shown to the supplier.
    parentContractId: uuid("parent_contract_id").references(() => contracts.id, { onDelete: "set null" }),
    // private (subcontracting; the buyer reviews) | disclosed (co-delivery; the end client reviews through the share)
    mode: text("mode").notNull().default("private"),
    title: text("title").notNull(),
    // draft | offered | accepted | in_progress | submitted | changes_requested | approved | closed | declined | withdrawn | cancelled
    status: text("status").notNull().default("draft"),
    currentVersion: integer("current_version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("work_orders_buyer_idx").on(t.buyerAgencyId, t.status), index("work_orders_supplier_idx").on(t.supplierAgencyId, t.status), index("work_orders_contract_idx").on(t.contractId)],
);

/** The scope at one point in time. Accepted versions are frozen by a trigger; a change is a new version. */
export const workOrderVersions = pgTable(
  "work_order_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workOrderId: uuid("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    deliverables: jsonb("deliverables").$type<DeliverableLine[]>().notNull().default([]),
    scope: text("scope").notNull().default(""),
    revisionAllowance: integer("revision_allowance").notNull().default(2),
    dueOn: text("due_on"),
    reviewDays: integer("review_days").notNull().default(7),
    // A reference to where the money is agreed (contract number / milestone), never an amount of its own.
    compensationNote: text("compensation_note").notNull().default(""),
    // What the supplier may use, show or reuse.
    permissionScope: text("permission_scope").notNull().default(""),
    proposedBy: text("proposed_by").notNull(), // buyer | supplier
    // proposed | accepted | superseded | declined
    status: text("status").notNull().default("proposed"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    termsHash: text("terms_hash"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("work_order_versions_idx").on(t.workOrderId, t.version)],
);

/** One line in one of two audiences: private (buyer's own notes) or shared (buyer and supplier). Scope never changes. */
export const workOrderMessages = pgTable(
  "work_order_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workOrderId: uuid("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    authorAgencyId: uuid("author_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(), // private | shared
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("work_order_messages_idx").on(t.workOrderId, t.scope, t.createdAt)],
);

/** A file version in the workspace (images through the existing pipeline). New versions never delete old ones. */
export const workOrderAssets = pgTable(
  "work_order_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workOrderId: uuid("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    // Versions of the same deliverable share a group id.
    groupId: uuid("group_id").notNull().defaultRandom(),
    version: integer("version").notNull().default(1),
    uploadedByAgencyId: uuid("uploaded_by_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    storageKey: text("storage_key").notNull(),
    thumbKey: text("thumb_key").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    bytes: integer("bytes").notNull(),
    // current | superseded
    status: text("status").notNull().default("current"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("work_order_assets_version_idx").on(t.groupId, t.version), index("work_order_assets_wo_idx").on(t.workOrderId, t.status)],
);

/** Feedback anchored to one asset version, optionally to a point on it (percent of width/height). */
export const workOrderComments = pgTable(
  "work_order_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => workOrderAssets.id, { onDelete: "cascade" }),
    authorAgencyId: uuid("author_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    x: real("x"),
    y: real("y"),
    createdAt: createdAt(),
  },
  (t) => [index("work_order_comments_idx").on(t.assetId, t.createdAt)],
);

/** Each hand-over and its answer. Earlier submissions stay as the record. */
export const workOrderSubmissions = pgTable(
  "work_order_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workOrderId: uuid("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    note: text("note").notNull().default(""),
    submittedAt: createdAt(),
    // approved | changes_requested
    decision: text("decision"),
    decisionNote: text("decision_note"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    // What the decision did on the authoritative contract, if anything (e.g. milestone approved / changes requested / none).
    contractEffect: text("contract_effect"),
  },
  (t) => [uniqueIndex("work_order_submissions_idx").on(t.workOrderId, t.round)],
);

/**
 * A hold on the capacity a provider declared in Sawwiq (availability window
 * units) for one work order: tentative while offered, confirmed atomically on
 * acceptance, released or expired otherwise. Nothing here reads an external calendar.
 */
export const capacityReservations = pgTable(
  "capacity_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerAgencyId: uuid("provider_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    workOrderId: uuid("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    units: integer("units").notNull().default(1),
    // tentative | confirmed | released | expired
    status: text("status").notNull().default("tentative"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("capacity_reservations_live_idx").on(t.workOrderId).where(sql`${t.status} in ('tentative', 'confirmed')`), index("capacity_reservations_provider_idx").on(t.providerAgencyId, t.status, t.startsAt), check("capacity_reservations_order", sql`${t.endsAt} > ${t.startsAt}`)],
);

/**
 * R3 (docs/50): a scope-to-team plan the buyer drafted from a redacted brief.
 * Packages, coverage and candidate ids come from deterministic rules and
 * authorized reads; the optional model only shapes the draft. Nothing here
 * commits anyone: a candidate is never a team member, a hold or a booking.
 */
export const collabPlans = pgTable(
  "collab_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    // The brief exactly as approved by the agency after redaction (what a model may see).
    brief: text("brief").notNull().default(""),
    deliverables: jsonb("deliverables").$type<DeliverableLine[]>().notNull().default([]),
    packages: jsonb("packages").$type<PlanPackage[]>().notNull().default([]),
    // Which sources produced the candidates: tool name, query and the ids it returned, for inspection.
    sources: jsonb("sources").$type<PlanSource[]>().notNull().default([]),
    // none | basic | <provider>: whether a model shaped the packages; candidates never come from it.
    assistant: text("assistant").notNull().default("none"),
    // Whether the agency asked for the assistant (informational; the daily budget is reserved in collab_ai_usage).
    assistantRequested: boolean("assistant_requested").notNull().default(false),
    // The agency's own notes on the plan. Never part of the planner request: the request is built
    // from a fixed whitelist of fields (lib/ai/planner.ts), so this column cannot reach a model.
    privateNotes: text("private_notes").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("collab_plans_agency_idx").on(t.agencyId, t.createdAt)],
);

/**
 * R3 hardening: the planner's daily assistant budget as a durable, atomic
 * counter per agency and UTC day. Reserved with one upsert before any model
 * call, so every instance shares the same row and deleting plans never
 * refunds a call. Rows are tiny and retained; the day column is YYYY-MM-DD.
 */
export const collabAiUsage = pgTable(
  "collab_ai_usage",
  {
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    used: integer("used").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.agencyId, t.day] })],
);

export type PlanCandidate = { agencyId: string; source: "partner" | "roster" | "discovery"; reasons: string[] };
export type PlanPackage = {
  key: string;
  title: string;
  deliverables: DeliverableLine[];
  roles: string[];
  // Per role: who could cover it. in_house | partner | candidate | unfilled, decided by rules only.
  coverage: { role: string; kind: "in_house" | "partner" | "candidate" | "unfilled"; candidates: PlanCandidate[] }[];
};
export type PlanSource = { tool: string; query: Record<string, unknown>; ids: string[] };

/**
 * R3 (docs/50): collaborator feedback, a class of its own. One record per
 * work order and side; only the two parties may write; confidential by
 * default (no client or asset identity); the provider may opt out of public
 * display; moderation and dispute states mirror reviews but never merge
 * with client reviews, Google ratings or paid-project provenance.
 */
export const collabFeedback = pgTable(
  "collab_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workOrderId: uuid("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    authorAgencyId: uuid("author_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    aboutAgencyId: uuid("about_agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    // buyer | supplier: the author's side of the engagement.
    authorRole: text("author_role").notNull(),
    communication: integer("communication").notNull(),
    reliability: integer("reliability").notNull(),
    quality: integer("quality").notNull(),
    body: text("body").notNull().default(""),
    // parties | public: how far the author consented to publish it.
    visibility: text("visibility").notNull().default("parties"),
    // published | disputed | hidden
    status: text("status").notNull().default("published"),
    disputeNote: text("dispute_note"),
    disputedAt: timestamp("disputed_at", { withTimezone: true }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("collab_feedback_once_idx").on(t.workOrderId, t.authorAgencyId), index("collab_feedback_about_idx").on(t.aboutAgencyId, t.status, t.createdAt)],
);

/** R3 (docs/50): per-agency collaboration notification preferences: muted reminder kinds and quiet hours (local hours, 0–23). */
export const collabPrefs = pgTable("collab_prefs", {
  agencyId: uuid("agency_id")
    .primaryKey()
    .references(() => agencies.id, { onDelete: "cascade" }),
  mutedKinds: text("muted_kinds").array().notNull().default(sql`'{}'::text[]`),
  quietStart: integer("quiet_start"),
  quietEnd: integer("quiet_end"),
  // Whether collaborator feedback about this agency may appear on its public page (opt-out, docs/50).
  showFeedback: boolean("show_feedback").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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
export type CollabProfile = typeof collabProfiles.$inferSelect;
export type AvailabilityWindow = typeof availabilityWindows.$inferSelect;
export type CollabNeed = typeof collabNeeds.$inferSelect;
export type CollabNeedReply = typeof collabNeedReplies.$inferSelect;
export type CollabRosterEntry = typeof collabRoster.$inferSelect;
export type CollabInvite = typeof collabInvites.$inferSelect;
export type WorkInquiry = typeof workInquiries.$inferSelect;
export type WorkInquiryRecipient = typeof workInquiryRecipients.$inferSelect;
export type WorkQuote = typeof workQuotes.$inferSelect;
export type WorkOrder = typeof workOrders.$inferSelect;
export type WorkOrderVersion = typeof workOrderVersions.$inferSelect;
export type WorkOrderMessage = typeof workOrderMessages.$inferSelect;
export type WorkOrderAsset = typeof workOrderAssets.$inferSelect;
export type WorkOrderComment = typeof workOrderComments.$inferSelect;
export type WorkOrderSubmission = typeof workOrderSubmissions.$inferSelect;
export type CapacityReservation = typeof capacityReservations.$inferSelect;
export type CollabPlan = typeof collabPlans.$inferSelect;
export type CollabAiUsage = typeof collabAiUsage.$inferSelect;
export type CollabFeedbackRow = typeof collabFeedback.$inferSelect;
export type CollabPrefs = typeof collabPrefs.$inferSelect;
export type SocialGrant = typeof socialGrants.$inferSelect;
export type SocialResource = typeof socialResources.$inferSelect;
export type SocialImportItem = typeof socialImportItems.$inferSelect;
export type PortfolioSetup = typeof portfolioSetups.$inferSelect;
export type PortfolioSetupMedia = typeof portfolioSetupMedia.$inferSelect;

/** Draft/publication preference. Missing rows preserve existing public accounts. */
export const profilePublications = pgTable("profile_publications", {
  agencyId: uuid("agency_id").primaryKey().references(() => agencies.id, { onDelete: "cascade" }),
  visibility: text("visibility").$type<"private" | "unlisted" | "public">().notNull().default("private"),
  consentVersion: text("consent_version").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("profile_publications_visibility_idx").on(t.visibility), check("profile_publications_visibility_check", sql`${t.visibility} in ('private', 'unlisted', 'public')`)]).enableRLS();
