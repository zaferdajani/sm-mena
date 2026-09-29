DO $$ BEGIN CREATE TYPE "public"."setup_status" AS ENUM('in_progress', 'paused', 'finished'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."social_grant_status" AS ENUM('active', 'limited', 'expired', 'revoked', 'revoke_pending', 'failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."social_item_state" AS ENUM('offered', 'draft', 'published', 'dismissed'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."social_ownership" AS ENUM('own', 'client'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."social_provider" AS ENUM('google', 'youtube', 'instagram', 'facebook', 'tiktok'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."social_resource_status" AS ENUM('pending', 'selected', 'removed'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_setup_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_setups" (
	"agency_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"status" "setup_status" DEFAULT 'in_progress' NOT NULL,
	"step" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"post_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_deletion_requests" (
	"code" text PRIMARY KEY NOT NULL,
	"provider" "social_provider" NOT NULL,
	"grants" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"user_id" uuid,
	"provider" "social_provider" NOT NULL,
	"provider_subject" text NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"sealed_access" text,
	"sealed_refresh" text,
	"key_version" integer DEFAULT 1 NOT NULL,
	"access_expires_at" timestamp with time zone,
	"refresh_expires_at" timestamp with time zone,
	"status" "social_grant_status" DEFAULT 'active' NOT NULL,
	"status_reason" text,
	"consent_version" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_import_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"provider" "social_provider" NOT NULL,
	"provider_item_id" text NOT NULL,
	"media_kind" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"permalink" text NOT NULL,
	"thumbnail_url" text,
	"published_at" timestamp with time zone,
	"state" "social_item_state" DEFAULT 'offered' NOT NULL,
	"post_id" uuid,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_oauth_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_hash" text NOT NULL,
	"provider" "social_provider" NOT NULL,
	"user_id" uuid NOT NULL,
	"agency_id" uuid NOT NULL,
	"session_hash" text NOT NULL,
	"ownership" "social_ownership" NOT NULL,
	"client_id" uuid,
	"locale" text NOT NULL,
	"return_to" text DEFAULT 'connections' NOT NULL,
	"sealed_verifier" text,
	"sealed_nonce" text,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_quota_usage" (
	"provider" "social_provider" NOT NULL,
	"day" text NOT NULL,
	"units" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "social_quota_usage_provider_day_pk" PRIMARY KEY("provider","day")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grant_id" uuid NOT NULL,
	"agency_id" uuid NOT NULL,
	"provider" "social_provider" NOT NULL,
	"kind" text NOT NULL,
	"provider_resource_id" text NOT NULL,
	"display_name" text NOT NULL,
	"handle" text,
	"ownership" "social_ownership" NOT NULL,
	"client_id" uuid,
	"status" "social_resource_status" DEFAULT 'pending' NOT NULL,
	"sealed_token" text,
	"pending_expires_at" timestamp with time zone,
	"selected_at" timestamp with time zone,
	"metadata_fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "source_provider" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "source_item_id" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "embed" jsonb;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "portfolio_setup_media" ADD CONSTRAINT "portfolio_setup_media_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "portfolio_setups" ADD CONSTRAINT "portfolio_setups_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "portfolio_setups" ADD CONSTRAINT "portfolio_setups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "portfolio_setups" ADD CONSTRAINT "portfolio_setups_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "social_grants" ADD CONSTRAINT "social_grants_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "social_grants" ADD CONSTRAINT "social_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "social_import_items" ADD CONSTRAINT "social_import_items_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "social_import_items" ADD CONSTRAINT "social_import_items_resource_id_social_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."social_resources"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "social_import_items" ADD CONSTRAINT "social_import_items_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "social_oauth_attempts" ADD CONSTRAINT "social_oauth_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "social_oauth_attempts" ADD CONSTRAINT "social_oauth_attempts_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "social_oauth_attempts" ADD CONSTRAINT "social_oauth_attempts_client_id_portfolio_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."portfolio_clients"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "social_resources" ADD CONSTRAINT "social_resources_grant_id_social_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."social_grants"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "social_resources" ADD CONSTRAINT "social_resources_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "social_resources" ADD CONSTRAINT "social_resources_client_id_portfolio_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."portfolio_clients"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "setup_media_agency_idx" ON "portfolio_setup_media" USING btree ("agency_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "social_grants_subject_idx" ON "social_grants" USING btree ("agency_id","provider","provider_subject");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "social_items_provider_idx" ON "social_import_items" USING btree ("agency_id","provider","provider_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_items_fetched_idx" ON "social_import_items" USING btree ("fetched_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "social_attempts_state_idx" ON "social_oauth_attempts" USING btree ("state_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_attempts_expires_idx" ON "social_oauth_attempts" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "social_resources_provider_idx" ON "social_resources" USING btree ("agency_id","provider","provider_resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_resources_grant_idx" ON "social_resources" USING btree ("grant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "posts_source_item_idx" ON "posts" USING btree ("agency_id","source_provider","source_item_id") WHERE source_item_id is not null;