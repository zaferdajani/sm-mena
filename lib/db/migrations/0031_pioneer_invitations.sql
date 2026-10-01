CREATE TABLE IF NOT EXISTS "pioneer_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"prospect_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"scans" integer DEFAULT 0 NOT NULL,
	"last_scan_at" timestamp with time zone,
	"watched_at" timestamp with time zone,
	"claimed_agency_id" uuid,
	"claimed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pioneer_invitations_code_unique" UNIQUE("code"),
	CONSTRAINT "pioneer_invitations_number_unique" UNIQUE("number"),
	CONSTRAINT "pioneer_invitations_claimed_agency_id_unique" UNIQUE("claimed_agency_id")
);
--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "pioneer_number" integer;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "pioneer_invitations" ADD CONSTRAINT "pioneer_invitations_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "pioneer_invitations" ADD CONSTRAINT "pioneer_invitations_claimed_agency_id_agencies_id_fk" FOREIGN KEY ("claimed_agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "pioneer_invitations" ADD CONSTRAINT "pioneer_invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pioneer_invitations_prospect_idx" ON "pioneer_invitations" USING btree ("prospect_id");--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "agencies" ADD CONSTRAINT "agencies_pioneer_number_unique" UNIQUE("pioneer_number"); EXCEPTION WHEN duplicate_object THEN null; END $$;