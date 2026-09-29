-- First-run portfolio setup drafts (docs/53). Additive: one private, resumable draft per agency.
CREATE TABLE IF NOT EXISTS "onboarding_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"step" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"source" text,
	"source_url" text,
	"client_mode" text,
	"client_id" uuid,
	"suggested_client" text,
	"title" text DEFAULT '' NOT NULL,
	"contribution" text DEFAULT '' NOT NULL,
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"platforms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cover" integer DEFAULT 0 NOT NULL,
	"post_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "onboarding_drafts_agency_id_unique" UNIQUE("agency_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_drafts" ADD CONSTRAINT "onboarding_drafts_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_drafts" ADD CONSTRAINT "onboarding_drafts_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_drafts" ADD CONSTRAINT "onboarding_drafts_client_id_portfolio_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."portfolio_clients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_drafts" ADD CONSTRAINT "onboarding_drafts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_drafts_expires_idx" ON "onboarding_drafts" USING btree ("status","expires_at");
