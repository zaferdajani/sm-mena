CREATE TYPE "public"."owner_match_status" AS ENUM('suggested', 'sent', 'accepted', 'declined', 'introduced');--> statement-breakpoint
CREATE TABLE "owner_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"agency_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "owner_match_status" DEFAULT 'suggested' NOT NULL,
	"batch_id" text NOT NULL,
	"sent_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"introduced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "owner_matches" ADD CONSTRAINT "owner_matches_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_matches" ADD CONSTRAINT "owner_matches_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "owner_matches_pair_idx" ON "owner_matches" USING btree ("owner_user_id","agency_id");--> statement-breakpoint
CREATE INDEX "owner_matches_agency_idx" ON "owner_matches" USING btree ("agency_id","status");