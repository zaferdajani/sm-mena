CREATE SEQUENCE IF NOT EXISTS "public"."founding_seat_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "founding_seat" integer;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "agencies" ADD CONSTRAINT "agencies_founding_seat_unique" UNIQUE("founding_seat");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
