ALTER TABLE "agencies" ADD COLUMN "accepting_projects" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "accepting_updated_at" timestamp with time zone;