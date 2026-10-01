DO $$ BEGIN CREATE TYPE "public"."prospect_status" AS ENUM('new', 'contacted', 'replied', 'joined', 'declined'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prospects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"website" text,
	"instagram" text,
	"city" text DEFAULT 'amman' NOT NULL,
	"country" text DEFAULT 'JO' NOT NULL,
	"services" text[] DEFAULT '{}'::text[] NOT NULL,
	"note" text,
	"source" text DEFAULT 'owner' NOT NULL,
	"status" "prospect_status" DEFAULT 'new' NOT NULL,
	"priority" boolean DEFAULT false NOT NULL,
	"contacted_at" timestamp with time zone,
	"agency_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prospects_name_key_unique" UNIQUE("name_key")
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "prospects" ADD CONSTRAINT "prospects_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "prospects" ADD CONSTRAINT "prospects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prospects_status_idx" ON "prospects" USING btree ("status");