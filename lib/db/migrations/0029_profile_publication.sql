-- Additive only. No account, portfolio, contract, membership or ledger is rewritten.
-- Absence of a row preserves legacy public links. Registration sign-ups write a
-- private row atomically with account creation. Choices survive every launch phase.
CREATE TABLE IF NOT EXISTS "profile_publications" (
  "agency_id" uuid PRIMARY KEY NOT NULL REFERENCES "agencies"("id") ON DELETE CASCADE,
  "visibility" text DEFAULT 'private' NOT NULL,
  "consent_version" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "profile_publications_visibility_check" CHECK ("visibility" IN ('private','unlisted','public'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_publications_visibility_idx" ON "profile_publications" ("visibility");
--> statement-breakpoint
ALTER TABLE "profile_publications" ENABLE ROW LEVEL SECURITY;
-- Access goes through the authenticated application data layer. No anonymous
-- Supabase policy; a public client key cannot list or change publication choices.
