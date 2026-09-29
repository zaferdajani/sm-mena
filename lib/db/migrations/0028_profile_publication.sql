CREATE TABLE IF NOT EXISTS "profile_publications" (
  "agency_id" uuid PRIMARY KEY NOT NULL,
  "visibility" text DEFAULT 'private' NOT NULL,
  "consent_version" text NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "profile_publications_visibility_check" CHECK ("visibility" IN ('private', 'unlisted', 'public')),
  CONSTRAINT "profile_publications_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_publications_visibility_idx" ON "profile_publications" ("visibility");
--> statement-breakpoint
ALTER TABLE "profile_publications" ENABLE ROW LEVEL SECURITY;
