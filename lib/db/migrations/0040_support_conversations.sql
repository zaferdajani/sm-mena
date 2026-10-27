ALTER TYPE "public"."support_status" ADD VALUE IF NOT EXISTS 'waiting' BEFORE 'done';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"author" text NOT NULL,
	"body" text NOT NULL,
	"screenshots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"emailed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "support_requests" ADD COLUMN IF NOT EXISTS "access_token" text;--> statement-breakpoint
ALTER TABLE "support_requests" ADD COLUMN IF NOT EXISTS "reporter_unread" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "support_requests" ADD COLUMN IF NOT EXISTS "confirmed_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_request_id_support_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."support_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_messages_request_idx" ON "support_messages" USING btree ("request_id","created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_access_token_unique" UNIQUE("access_token");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null;
END $$;--> statement-breakpoint
-- Existing reports get their private link too.
UPDATE "support_requests" SET "access_token" = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '') WHERE "access_token" IS NULL;
