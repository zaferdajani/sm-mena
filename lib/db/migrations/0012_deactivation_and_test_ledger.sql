ALTER TYPE "public"."agency_status" ADD VALUE 'deactivated';--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "deactivated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "deactivation_reason" text;--> statement-breakpoint
ALTER TABLE "escrow_ledger" ADD COLUMN "test" boolean GENERATED ALWAYS AS (provider = 'mock') STORED NOT NULL;