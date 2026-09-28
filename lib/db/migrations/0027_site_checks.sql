CREATE TABLE IF NOT EXISTS "site_checks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ok" boolean NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"closed" integer DEFAULT 0 NOT NULL,
	"results" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_checks_ran_idx" ON "site_checks" USING btree ("ran_at");