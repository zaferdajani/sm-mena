-- Collaboration V2, release 2 (docs/49-work-orders.md): additive tables only; contracts, milestones and the ledger are untouched.
CREATE TABLE IF NOT EXISTS "capacity_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_agency_id" uuid NOT NULL,
	"work_order_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"units" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'tentative' NOT NULL,
	"expires_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capacity_reservations_order" CHECK ("capacity_reservations"."ends_at" > "capacity_reservations"."starts_at")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_order_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"group_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"uploaded_by_agency_id" uuid NOT NULL,
	"name" text NOT NULL,
	"storage_key" text NOT NULL,
	"thumb_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" integer NOT NULL,
	"status" text DEFAULT 'current' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_order_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"author_agency_id" uuid NOT NULL,
	"body" text NOT NULL,
	"x" real,
	"y" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_order_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"author_agency_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_order_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decision" text,
	"decision_note" text,
	"decided_at" timestamp with time zone,
	"contract_effect" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_order_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"deliverables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scope" text DEFAULT '' NOT NULL,
	"revision_allowance" integer DEFAULT 2 NOT NULL,
	"due_on" text,
	"review_days" integer DEFAULT 7 NOT NULL,
	"compensation_note" text DEFAULT '' NOT NULL,
	"permission_scope" text DEFAULT '' NOT NULL,
	"proposed_by" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"accepted_at" timestamp with time zone,
	"terms_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_agency_id" uuid NOT NULL,
	"supplier_agency_id" uuid NOT NULL,
	"inquiry_id" uuid,
	"contract_id" uuid,
	"milestone_id" uuid,
	"parent_contract_id" uuid,
	"mode" text DEFAULT 'private' NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "capacity_reservations" ADD CONSTRAINT "capacity_reservations_provider_agency_id_agencies_id_fk" FOREIGN KEY ("provider_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "capacity_reservations" ADD CONSTRAINT "capacity_reservations_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_order_assets" ADD CONSTRAINT "work_order_assets_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_order_assets" ADD CONSTRAINT "work_order_assets_uploaded_by_agency_id_agencies_id_fk" FOREIGN KEY ("uploaded_by_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_order_comments" ADD CONSTRAINT "work_order_comments_asset_id_work_order_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."work_order_assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_order_comments" ADD CONSTRAINT "work_order_comments_author_agency_id_agencies_id_fk" FOREIGN KEY ("author_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_order_messages" ADD CONSTRAINT "work_order_messages_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_order_messages" ADD CONSTRAINT "work_order_messages_author_agency_id_agencies_id_fk" FOREIGN KEY ("author_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_order_submissions" ADD CONSTRAINT "work_order_submissions_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_order_versions" ADD CONSTRAINT "work_order_versions_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_buyer_agency_id_agencies_id_fk" FOREIGN KEY ("buyer_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_supplier_agency_id_agencies_id_fk" FOREIGN KEY ("supplier_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_inquiry_id_work_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."work_inquiries"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_parent_contract_id_contracts_id_fk" FOREIGN KEY ("parent_contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "capacity_reservations_live_idx" ON "capacity_reservations" USING btree ("work_order_id") WHERE "capacity_reservations"."status" in ('tentative', 'confirmed');
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "capacity_reservations_provider_idx" ON "capacity_reservations" USING btree ("provider_agency_id","status","starts_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "work_order_assets_version_idx" ON "work_order_assets" USING btree ("group_id","version");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_order_assets_wo_idx" ON "work_order_assets" USING btree ("work_order_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_order_comments_idx" ON "work_order_comments" USING btree ("asset_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_order_messages_idx" ON "work_order_messages" USING btree ("work_order_id","scope","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "work_order_submissions_idx" ON "work_order_submissions" USING btree ("work_order_id","round");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "work_order_versions_idx" ON "work_order_versions" USING btree ("work_order_id","version");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_orders_buyer_idx" ON "work_orders" USING btree ("buyer_agency_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_orders_supplier_idx" ON "work_orders" USING btree ("supplier_agency_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_orders_contract_idx" ON "work_orders" USING btree ("contract_id");
--> statement-breakpoint
-- An accepted version is frozen like signed terms: its content cannot change and it cannot be deleted (docs/49).
CREATE OR REPLACE FUNCTION work_order_versions_frozen() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- A direct delete of history is refused; a cascade from the parent work order (trigger depth > 1) is allowed.
    IF OLD.status IN ('accepted', 'superseded') AND pg_trigger_depth() <= 1 THEN RAISE EXCEPTION 'work order version % is % and cannot be deleted', OLD.id, OLD.status; END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'superseded' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'work order version % is superseded history and cannot change', OLD.id;
  END IF;
  IF OLD.status = 'accepted' AND (
    NEW.deliverables IS DISTINCT FROM OLD.deliverables OR NEW.scope IS DISTINCT FROM OLD.scope OR NEW.revision_allowance IS DISTINCT FROM OLD.revision_allowance
    OR NEW.due_on IS DISTINCT FROM OLD.due_on OR NEW.review_days IS DISTINCT FROM OLD.review_days OR NEW.compensation_note IS DISTINCT FROM OLD.compensation_note
    OR NEW.permission_scope IS DISTINCT FROM OLD.permission_scope OR NEW.proposed_by IS DISTINCT FROM OLD.proposed_by OR NEW.terms_hash IS DISTINCT FROM OLD.terms_hash
    OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at OR NEW.work_order_id IS DISTINCT FROM OLD.work_order_id OR NEW.version IS DISTINCT FROM OLD.version
    OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'superseded')
  ) THEN
    RAISE EXCEPTION 'work order version % is accepted and frozen', OLD.id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS work_order_versions_frozen_trg ON "work_order_versions";
--> statement-breakpoint
CREATE TRIGGER work_order_versions_frozen_trg BEFORE UPDATE OR DELETE ON "work_order_versions" FOR EACH ROW EXECUTE FUNCTION work_order_versions_frozen();
