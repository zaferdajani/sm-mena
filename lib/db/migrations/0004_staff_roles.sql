ALTER TYPE "public"."user_role" ADD VALUE 'owner';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'backbone';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'maintenance';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'support';--> statement-breakpoint
CREATE TABLE "staff_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" NOT NULL,
	"token_hash" text NOT NULL,
	"access_until" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by" uuid NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "staff_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "disabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invited_by" uuid;--> statement-breakpoint
CREATE INDEX "staff_invites_email_idx" ON "staff_invites" USING btree ("email");