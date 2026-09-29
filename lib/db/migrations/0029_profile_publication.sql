CREATE TABLE IF NOT EXISTS "profile_publications" (
	"agency_id" uuid PRIMARY KEY NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"consent_version" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_publications_visibility_check" CHECK ("profile_publications"."visibility" in ('private', 'unlisted', 'public'))
);
--> statement-breakpoint
ALTER TABLE "profile_publications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "profile_publications" ADD CONSTRAINT "profile_publications_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_publications_visibility_idx" ON "profile_publications" USING btree ("visibility");