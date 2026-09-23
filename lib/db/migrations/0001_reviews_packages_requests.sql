CREATE TYPE "public"."billing" AS ENUM('monthly', 'one_off');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('sent', 'shortlisted', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."review_source" AS ENUM('invite', 'inquiry');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('published', 'hidden');--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'recommended';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'proposal';--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"service" text NOT NULL,
	"price_jod" integer NOT NULL,
	"billing" "billing" DEFAULT 'monthly' NOT NULL,
	"deliverables" text[] DEFAULT '{}'::text[] NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"client_name" text NOT NULL,
	"phone" text NOT NULL,
	"business_name" text,
	"business_type" text,
	"services" text[] DEFAULT '{}'::text[] NOT NULL,
	"platforms" text[] DEFAULT '{}'::text[] NOT NULL,
	"city" text,
	"budget_min_jod" integer,
	"budget_max_jod" integer,
	"timeline" text,
	"description" text NOT NULL,
	"source" text DEFAULT 'form' NOT NULL,
	"status" "request_status" DEFAULT 'open' NOT NULL,
	"visitor_id" text,
	"consent_version" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_requests_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"agency_id" uuid NOT NULL,
	"price_jod" integer NOT NULL,
	"billing" "billing" DEFAULT 'monthly' NOT NULL,
	"timeline" text NOT NULL,
	"message" text NOT NULL,
	"status" "proposal_status" DEFAULT 'sent' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_matches" (
	"request_id" uuid NOT NULL,
	"agency_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"invited" boolean DEFAULT false NOT NULL,
	"viewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "request_matches_request_id_agency_id_pk" PRIMARY KEY("request_id","agency_id")
);
--> statement-breakpoint
CREATE TABLE "review_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"client_name" text DEFAULT '' NOT NULL,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_requests_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"request_id" uuid,
	"source" "review_source" NOT NULL,
	"rating" integer NOT NULL,
	"quality" integer,
	"communication" integer,
	"value" integer,
	"timeliness" integer,
	"body" text NOT NULL,
	"reviewer_name" text NOT NULL,
	"reviewer_business" text,
	"service" text,
	"visitor_id" text,
	"status" "review_status" DEFAULT 'published' NOT NULL,
	"reply" text,
	"replied_at" timestamp with time zone,
	"consent_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "rating_sum" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "rating_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "google_place_id" text;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "google_maps_url" text;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "google_rating" real;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "google_rating_count" integer;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "google_fetched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "pinned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_request_id_project_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."project_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_matches" ADD CONSTRAINT "request_matches_request_id_project_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."project_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_matches" ADD CONSTRAINT "request_matches_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_request_id_review_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."review_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "packages_agency_idx" ON "packages" USING btree ("agency_id","position");--> statement-breakpoint
CREATE INDEX "packages_service_idx" ON "packages" USING btree ("service","price_jod");--> statement-breakpoint
CREATE INDEX "project_requests_open_idx" ON "project_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "project_requests_services_idx" ON "project_requests" USING gin ("services");--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_request_agency_idx" ON "proposals" USING btree ("request_id","agency_id");--> statement-breakpoint
CREATE INDEX "proposals_agency_idx" ON "proposals" USING btree ("agency_id","created_at");--> statement-breakpoint
CREATE INDEX "request_matches_agency_idx" ON "request_matches" USING btree ("agency_id","created_at");--> statement-breakpoint
CREATE INDEX "review_requests_agency_idx" ON "review_requests" USING btree ("agency_id","created_at");--> statement-breakpoint
CREATE INDEX "reviews_agency_idx" ON "reviews" USING btree ("agency_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_visitor_agency_idx" ON "reviews" USING btree ("agency_id","visitor_id");