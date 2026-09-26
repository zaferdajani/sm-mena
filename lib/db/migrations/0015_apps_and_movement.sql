ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "app" jsonb;--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS "agency_member_seq";--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "member_no" integer;--> statement-breakpoint
UPDATE "agencies" SET "member_no" = numbered.rn FROM (SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn FROM "agencies") AS numbered WHERE "agencies".id = numbered.id AND "agencies"."member_no" IS NULL;--> statement-breakpoint
SELECT setval('agency_member_seq', COALESCE((SELECT max("member_no") FROM "agencies"), 0) + 1, false);--> statement-breakpoint
ALTER TABLE "agencies" ALTER COLUMN "member_no" SET DEFAULT nextval('agency_member_seq');--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agencies_member_no_idx" ON "agencies" ("member_no");--> statement-breakpoint
ALTER TABLE "portfolio_clients" ADD COLUMN IF NOT EXISTS "confirm_token" text;--> statement-breakpoint
ALTER TABLE "portfolio_clients" ADD COLUMN IF NOT EXISTS "confirmed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_clients_confirm_token_idx" ON "portfolio_clients" ("confirm_token");
