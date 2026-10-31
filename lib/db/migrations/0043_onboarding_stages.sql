ALTER TYPE "public"."event_type" ADD VALUE 'join_view';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'account_created';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'first_photo_uploaded';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'page_published';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'link_shared';--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "setup_reminders_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "setup_reminders_sent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "setup_reminder_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "previous_handle" text;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "handle_changed_at" timestamp with time zone;