ALTER TABLE "pioneer_invitations" ALTER COLUMN "number" DROP NOT NULL;--> statement-breakpoint
-- Medals are numbered when claimed (docs/57): letters not yet claimed give their number back.
UPDATE "pioneer_invitations" SET "number" = NULL WHERE "claimed_agency_id" IS NULL;
