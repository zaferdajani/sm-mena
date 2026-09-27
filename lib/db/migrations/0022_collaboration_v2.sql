-- Collaboration V2, release 1 (docs/48-collaboration-v2.md): additive tables only.
-- Nothing here touches contracts, milestones, shares or the ledger.
CREATE TABLE IF NOT EXISTS "availability_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'Asia/Amman' NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"capacity_units" integer,
	"capacity_unit" text,
	"visibility" text DEFAULT 'partners' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_windows_order" CHECK ("availability_windows"."ends_at" > "availability_windows"."starts_at")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collab_blocks" (
	"blocker_agency_id" uuid NOT NULL,
	"blocked_agency_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collab_blocks_blocker_agency_id_blocked_agency_id_pk" PRIMARY KEY("blocker_agency_id","blocked_agency_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collab_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_agency_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_agency_id" uuid,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collab_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collab_need_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"need_id" uuid NOT NULL,
	"agency_id" uuid NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'interested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collab_needs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"title" text NOT NULL,
	"roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"services" text[] DEFAULT '{}'::text[] NOT NULL,
	"scope" text DEFAULT '' NOT NULL,
	"work_mode" text DEFAULT 'remote' NOT NULL,
	"city" text,
	"country" text DEFAULT 'jo' NOT NULL,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"starts_on" text,
	"ends_on" text,
	"budget_min_fils" integer,
	"budget_max_fils" integer,
	"currency" text DEFAULT 'JOD' NOT NULL,
	"modes" text[] DEFAULT '{private}'::text[] NOT NULL,
	"audience" text DEFAULT 'public' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collab_profiles" (
	"agency_id" uuid PRIMARY KEY NOT NULL,
	"modes" text[] DEFAULT '{}'::text[] NOT NULL,
	"work_modes" text[] DEFAULT '{}'::text[] NOT NULL,
	"open_to_work" boolean,
	"consent_version" text DEFAULT 'collab-2026-09' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collab_roster" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_agency_id" uuid NOT NULL,
	"provider_agency_id" uuid NOT NULL,
	"group_name" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"rate_fils" integer,
	"rate_currency" text,
	"rate_unit" text,
	"last_engaged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_agency_id" uuid NOT NULL,
	"need_id" uuid,
	"parent_contract_id" uuid,
	"title" text NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"deliverables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assets_note" text DEFAULT '' NOT NULL,
	"scope" text DEFAULT '' NOT NULL,
	"starts_on" text,
	"due_on" text,
	"timezone" text DEFAULT 'Asia/Amman' NOT NULL,
	"work_mode" text DEFAULT 'remote' NOT NULL,
	"city" text,
	"country" text DEFAULT 'jo' NOT NULL,
	"budget_fils" integer,
	"currency" text DEFAULT 'JOD' NOT NULL,
	"privacy_mode" text DEFAULT 'private' NOT NULL,
	"response_by" timestamp with time zone,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"accepted_quote_id" uuid,
	"contract_request_id" uuid,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_inquiry_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"supplier_agency_id" uuid NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"viewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"supplier_agency_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"amount_fils" integer NOT NULL,
	"currency" text DEFAULT 'JOD' NOT NULL,
	"starts_on" text,
	"due_on" text,
	"scope_note" text DEFAULT '' NOT NULL,
	"exclusions" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "availability_windows" ADD CONSTRAINT "availability_windows_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "collab_blocks" ADD CONSTRAINT "collab_blocks_blocker_agency_id_agencies_id_fk" FOREIGN KEY ("blocker_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "collab_blocks" ADD CONSTRAINT "collab_blocks_blocked_agency_id_agencies_id_fk" FOREIGN KEY ("blocked_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "collab_invites" ADD CONSTRAINT "collab_invites_from_agency_id_agencies_id_fk" FOREIGN KEY ("from_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "collab_invites" ADD CONSTRAINT "collab_invites_accepted_agency_id_agencies_id_fk" FOREIGN KEY ("accepted_agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "collab_need_replies" ADD CONSTRAINT "collab_need_replies_need_id_collab_needs_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."collab_needs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "collab_need_replies" ADD CONSTRAINT "collab_need_replies_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "collab_needs" ADD CONSTRAINT "collab_needs_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "collab_profiles" ADD CONSTRAINT "collab_profiles_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "collab_roster" ADD CONSTRAINT "collab_roster_owner_agency_id_agencies_id_fk" FOREIGN KEY ("owner_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "collab_roster" ADD CONSTRAINT "collab_roster_provider_agency_id_agencies_id_fk" FOREIGN KEY ("provider_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_inquiries" ADD CONSTRAINT "work_inquiries_buyer_agency_id_agencies_id_fk" FOREIGN KEY ("buyer_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_inquiries" ADD CONSTRAINT "work_inquiries_need_id_collab_needs_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."collab_needs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_inquiries" ADD CONSTRAINT "work_inquiries_parent_contract_id_contracts_id_fk" FOREIGN KEY ("parent_contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_inquiries" ADD CONSTRAINT "work_inquiries_contract_request_id_contract_requests_id_fk" FOREIGN KEY ("contract_request_id") REFERENCES "public"."contract_requests"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_inquiry_recipients" ADD CONSTRAINT "work_inquiry_recipients_inquiry_id_work_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."work_inquiries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_inquiry_recipients" ADD CONSTRAINT "work_inquiry_recipients_supplier_agency_id_agencies_id_fk" FOREIGN KEY ("supplier_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_quotes" ADD CONSTRAINT "work_quotes_inquiry_id_work_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."work_inquiries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_quotes" ADD CONSTRAINT "work_quotes_supplier_agency_id_agencies_id_fk" FOREIGN KEY ("supplier_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "availability_windows_agency_idx" ON "availability_windows" USING btree ("agency_id","starts_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collab_invites_from_idx" ON "collab_invites" USING btree ("from_agency_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "collab_need_replies_pair_idx" ON "collab_need_replies" USING btree ("need_id","agency_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collab_need_replies_agency_idx" ON "collab_need_replies" USING btree ("agency_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collab_needs_open_idx" ON "collab_needs" USING btree ("status","country","expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collab_needs_agency_idx" ON "collab_needs" USING btree ("agency_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "collab_roster_pair_idx" ON "collab_roster" USING btree ("owner_agency_id","provider_agency_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collab_roster_owner_idx" ON "collab_roster" USING btree ("owner_agency_id","group_name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_inquiries_buyer_idx" ON "work_inquiries" USING btree ("buyer_agency_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "work_inquiry_recipients_pair_idx" ON "work_inquiry_recipients" USING btree ("inquiry_id","supplier_agency_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_inquiry_recipients_supplier_idx" ON "work_inquiry_recipients" USING btree ("supplier_agency_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "work_quotes_version_idx" ON "work_quotes" USING btree ("inquiry_id","supplier_agency_id","version");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_quotes_inquiry_idx" ON "work_quotes" USING btree ("inquiry_id","status");
