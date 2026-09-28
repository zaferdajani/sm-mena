-- Collaboration V2 release 3 (docs/50): plans, collaborator feedback, notification preferences. Additive and idempotent.
CREATE TABLE IF NOT EXISTS "collab_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"author_agency_id" uuid NOT NULL,
	"about_agency_id" uuid NOT NULL,
	"author_role" text NOT NULL,
	"communication" integer NOT NULL,
	"reliability" integer NOT NULL,
	"quality" integer NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"visibility" text DEFAULT 'parties' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"dispute_note" text,
	"disputed_at" timestamp with time zone,
	"moderated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collab_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"title" text NOT NULL,
	"brief" text DEFAULT '' NOT NULL,
	"deliverables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"packages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assistant" text DEFAULT 'none' NOT NULL,
	"assistant_requested" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collab_prefs" (
	"agency_id" uuid PRIMARY KEY NOT NULL,
	"muted_kinds" text[] DEFAULT '{}'::text[] NOT NULL,
	"quiet_start" integer,
	"quiet_end" integer,
	"show_feedback" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "collab_feedback" ADD CONSTRAINT "collab_feedback_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "collab_feedback" ADD CONSTRAINT "collab_feedback_author_agency_id_agencies_id_fk" FOREIGN KEY ("author_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "collab_feedback" ADD CONSTRAINT "collab_feedback_about_agency_id_agencies_id_fk" FOREIGN KEY ("about_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "collab_plans" ADD CONSTRAINT "collab_plans_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "collab_prefs" ADD CONSTRAINT "collab_prefs_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "collab_feedback_once_idx" ON "collab_feedback" USING btree ("work_order_id","author_agency_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collab_feedback_about_idx" ON "collab_feedback" USING btree ("about_agency_id","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collab_plans_agency_idx" ON "collab_plans" USING btree ("agency_id","created_at");