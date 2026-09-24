ALTER TABLE "agencies" ALTER COLUMN "country" SET DEFAULT 'jo';--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "currency" text DEFAULT 'JOD' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_requests" ADD COLUMN "country" text DEFAULT 'jo' NOT NULL;--> statement-breakpoint
UPDATE "agencies" SET "country" = lower("country");
