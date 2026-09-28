-- R3 hardening: a durable, atomic daily assistant budget per agency (collab_ai_usage)
-- and private plan notes that are stored but structurally excluded from the planner request.
CREATE TABLE IF NOT EXISTS "collab_ai_usage" (
	"agency_id" uuid NOT NULL,
	"day" text NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collab_ai_usage_agency_id_day_pk" PRIMARY KEY("agency_id","day")
);
--> statement-breakpoint
ALTER TABLE "collab_plans" ADD COLUMN IF NOT EXISTS "private_notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "collab_ai_usage" ADD CONSTRAINT "collab_ai_usage_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
