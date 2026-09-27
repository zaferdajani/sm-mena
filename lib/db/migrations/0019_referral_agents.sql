ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'agent';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"phone" text,
	"rate_fils" integer DEFAULT 5000 NOT NULL,
	"currency" text DEFAULT 'JOD' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_agents_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "referral_agents_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"amount_fils" integer NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "referred_by_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "referral_void_reason" text;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "referral_agents" ADD CONSTRAINT "referral_agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "referral_agents" ADD CONSTRAINT "referral_agents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "referral_payouts" ADD CONSTRAINT "referral_payouts_agent_id_referral_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."referral_agents"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "referral_payouts" ADD CONSTRAINT "referral_payouts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referral_payouts_agent_idx" ON "referral_payouts" USING btree ("agent_id","created_at");