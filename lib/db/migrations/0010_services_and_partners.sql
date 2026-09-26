CREATE TYPE "public"."agency_kind" AS ENUM('agency', 'freelancer');--> statement-breakpoint
CREATE TYPE "public"."partner_request_status" AS ENUM('pending', 'accepted', 'declined', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."service_tag_status" AS ENUM('approved', 'pending', 'rejected');--> statement-breakpoint
CREATE TABLE "partner_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_agency_id" uuid NOT NULL,
	"to_agency_id" uuid NOT NULL,
	"roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"status" "partner_request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "service_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"group" text DEFAULT 'other' NOT NULL,
	"parent" text,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "service_tag_status" DEFAULT 'pending' NOT NULL,
	"builtin" boolean DEFAULT false NOT NULL,
	"proposed_text" text,
	"proposed_by_agency_id" uuid,
	"merged_into_id" integer,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"search_text" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_tags_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "kind" "agency_kind" DEFAULT 'agency' NOT NULL;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "pending_services" integer[] DEFAULT '{}'::integer[] NOT NULL;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "team_roles" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "seeks_roles" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "partner_requests" ADD CONSTRAINT "partner_requests_from_agency_id_agencies_id_fk" FOREIGN KEY ("from_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_requests" ADD CONSTRAINT "partner_requests_to_agency_id_agencies_id_fk" FOREIGN KEY ("to_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tags" ADD CONSTRAINT "service_tags_proposed_by_agency_id_agencies_id_fk" FOREIGN KEY ("proposed_by_agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tags" ADD CONSTRAINT "service_tags_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "partner_requests_to_idx" ON "partner_requests" USING btree ("to_agency_id","status");--> statement-breakpoint
CREATE INDEX "partner_requests_from_idx" ON "partner_requests" USING btree ("from_agency_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_requests_open_pair_idx" ON "partner_requests" USING btree ("from_agency_id","to_agency_id") WHERE "partner_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "service_tags_status_idx" ON "service_tags" USING btree ("status");