ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'client';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "login_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "login_codes_email_idx" ON "login_codes" USING btree ("email","created_at");--> statement-breakpoint
-- From now on follows, likes and saves come from signed-in accounts ("u:<user id>").
-- Counts show only those; anonymous device rows stay until their device signs in
-- and they move to the account (docs/41).
-- Demo agencies keep their sample numbers.
UPDATE "agencies" a SET "follower_count" = (SELECT count(*) FROM "follows" f WHERE f.agency_id = a.id AND f.visitor_id LIKE 'u:%') WHERE NOT a.is_demo;--> statement-breakpoint
UPDATE "posts" p SET "like_count" = (SELECT count(*) FROM "likes" l WHERE l.post_id = p.id AND l.visitor_id LIKE 'u:%'), "save_count" = (SELECT count(*) FROM "saves" s WHERE s.post_id = p.id AND s.visitor_id LIKE 'u:%') WHERE p.agency_id IN (SELECT id FROM "agencies" WHERE NOT is_demo);
