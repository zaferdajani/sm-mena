import { sql } from "drizzle-orm";
import {
  bigserial,
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
export const userRole = pgEnum("user_role", ["agency", "admin"]);
export const agencyStatus = pgEnum("agency_status", ["active", "suspended"]);
export const planId = pgEnum("plan_id", ["free", "pro", "business"]);
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
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    // sha256 of the cookie token; the raw token is never stored
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
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
    country: text("country").notNull().default("JO"),
    city: text("city").notNull(),
    services: text("services").array().notNull().default(sql`'{}'::text[]`),
    platforms: text("platforms").array().notNull().default(sql`'{}'::text[]`),
    industries: text("industries").array().notNull().default(sql`'{}'::text[]`),
    languages: text("languages").array().notNull().default(sql`'{ar}'::text[]`),
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
    plan: planId("plan").notNull().default("free"),
    planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
    followerCount: integer("follower_count").notNull().default(0),
    postCount: integer("post_count").notNull().default(0),
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
    status: postStatus("status").notNull().default("published"),
    likeCount: integer("like_count").notNull().default(0),
    saveCount: integer("save_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
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
    createdAt: createdAt(),
  },
  (t) => [
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

export const auditLogs = pgTable("audit_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  meta: jsonb("meta").notNull().default({}),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type Agency = typeof agencies.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PostImage = typeof postImages.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
export type Promotion = typeof promotions.$inferSelect;
export type Report = typeof reports.$inferSelect;
