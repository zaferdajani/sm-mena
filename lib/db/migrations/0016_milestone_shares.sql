CREATE TABLE IF NOT EXISTS "milestone_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"milestone_id" uuid NOT NULL,
	"agency_id" uuid NOT NULL,
	"partner_agency_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"percent" integer,
	"amount_fils" integer NOT NULL,
	"note" text,
	"status" text DEFAULT 'proposed' NOT NULL,
	"terms_hash" text,
	"accepted_at" timestamp with time zone,
	"paid_by_agency_at" timestamp with time zone,
	"received_by_partner_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "escrow_ledger" ADD COLUMN IF NOT EXISTS "payee_agency_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "milestone_shares" ADD CONSTRAINT "milestone_shares_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "milestone_shares" ADD CONSTRAINT "milestone_shares_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "milestone_shares" ADD CONSTRAINT "milestone_shares_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "milestone_shares" ADD CONSTRAINT "milestone_shares_partner_agency_id_agencies_id_fk" FOREIGN KEY ("partner_agency_id") REFERENCES "public"."agencies"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "milestone_shares_live_idx" ON "milestone_shares" USING btree ("milestone_id") WHERE status in ('proposed', 'accepted');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "milestone_shares_partner_idx" ON "milestone_shares" USING btree ("partner_agency_id","status");--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "escrow_ledger" ADD CONSTRAINT "escrow_ledger_payee_agency_id_agencies_id_fk" FOREIGN KEY ("payee_agency_id") REFERENCES "public"."agencies"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
-- An accepted share is frozen, like signed contract terms: only the direct-payment
-- marks may change, and it can't be deleted (docs/40-collaboration.md).
CREATE OR REPLACE FUNCTION milestone_shares_frozen() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'accepted' THEN RAISE EXCEPTION 'milestone share % is accepted and cannot be deleted', OLD.id; END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'accepted' AND (
    NEW.status IS DISTINCT FROM OLD.status OR NEW.amount_fils IS DISTINCT FROM OLD.amount_fils OR NEW.kind IS DISTINCT FROM OLD.kind
    OR NEW.percent IS DISTINCT FROM OLD.percent OR NEW.partner_agency_id IS DISTINCT FROM OLD.partner_agency_id
    OR NEW.agency_id IS DISTINCT FROM OLD.agency_id OR NEW.milestone_id IS DISTINCT FROM OLD.milestone_id
    OR NEW.contract_id IS DISTINCT FROM OLD.contract_id OR NEW.terms_hash IS DISTINCT FROM OLD.terms_hash
    OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
  ) THEN
    RAISE EXCEPTION 'milestone share % is accepted and frozen', OLD.id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS milestone_shares_frozen ON "milestone_shares";--> statement-breakpoint
CREATE TRIGGER milestone_shares_frozen BEFORE UPDATE OR DELETE ON "milestone_shares" FOR EACH ROW EXECUTE FUNCTION milestone_shares_frozen();
