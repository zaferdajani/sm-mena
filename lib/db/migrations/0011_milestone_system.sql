CREATE TYPE "public"."dispute_status" AS ENUM('open', 'decided', 'appealed', 'final', 'closed');--> statement-breakpoint
ALTER TYPE "public"."milestone_status" ADD VALUE 'split';--> statement-breakpoint
ALTER TYPE "public"."review_source" ADD VALUE 'contract';--> statement-breakpoint
CREATE TABLE "cancellation_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"proposed_by" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"splits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_agency_id" uuid NOT NULL,
	"to_agency_id" uuid NOT NULL,
	"title" text NOT NULL,
	"brief" text DEFAULT '' NOT NULL,
	"budget_fils" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"contract_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dispute_evidence" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"dispute_id" uuid NOT NULL,
	"side" text NOT NULL,
	"body" text NOT NULL,
	"links" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestone_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"milestone_id" uuid NOT NULL,
	"opened_by" text NOT NULL,
	"statement" text NOT NULL,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"decision" text,
	"release_fils" integer,
	"refund_fils" integer,
	"reason" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"appeal_deadline" timestamp with time zone,
	"agency_accepted_at" timestamp with time zone,
	"client_accepted_at" timestamp with time zone,
	"appealed_by" text,
	"appeal_note" text,
	"appealed_at" timestamp with time zone,
	"first_decision" jsonb,
	"final_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "review_days" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "revision_rounds" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "payments_live" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "client_agency_id" uuid;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "client_visitor_id" text;--> statement-breakpoint
ALTER TABLE "escrow_ledger" ADD COLUMN "idem_key" text;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "review_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "reminders_sent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "change_rounds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "extra_rounds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "extra_round_asked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "review_requests" ADD COLUMN "contract_id" uuid;--> statement-breakpoint
ALTER TABLE "review_requests" ADD COLUMN "token_enc" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "contract_id" uuid;--> statement-breakpoint
ALTER TABLE "cancellation_proposals" ADD CONSTRAINT "cancellation_proposals_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_requests" ADD CONSTRAINT "contract_requests_from_agency_id_agencies_id_fk" FOREIGN KEY ("from_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_requests" ADD CONSTRAINT "contract_requests_to_agency_id_agencies_id_fk" FOREIGN KEY ("to_agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_requests" ADD CONSTRAINT "contract_requests_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_dispute_id_milestone_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "public"."milestone_disputes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_disputes" ADD CONSTRAINT "milestone_disputes_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_disputes" ADD CONSTRAINT "milestone_disputes_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_disputes" ADD CONSTRAINT "milestone_disputes_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cancellation_proposals_idx" ON "cancellation_proposals" USING btree ("contract_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cancellation_proposals_pending_idx" ON "cancellation_proposals" USING btree ("contract_id") WHERE "cancellation_proposals"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "contract_requests_to_idx" ON "contract_requests" USING btree ("to_agency_id","status");--> statement-breakpoint
CREATE INDEX "contract_requests_from_idx" ON "contract_requests" USING btree ("from_agency_id","status");--> statement-breakpoint
CREATE INDEX "dispute_evidence_idx" ON "dispute_evidence" USING btree ("dispute_id","created_at");--> statement-breakpoint
CREATE INDEX "milestone_disputes_contract_idx" ON "milestone_disputes" USING btree ("contract_id","created_at");--> statement-breakpoint
CREATE INDEX "milestone_disputes_status_idx" ON "milestone_disputes" USING btree ("status","appeal_deadline");--> statement-breakpoint
CREATE UNIQUE INDEX "milestone_disputes_open_idx" ON "milestone_disputes" USING btree ("milestone_id") WHERE "milestone_disputes"."status" in ('open', 'decided', 'appealed');--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_agency_id_agencies_id_fk" FOREIGN KEY ("client_agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contracts_client_agency_idx" ON "contracts" USING btree ("client_agency_id");--> statement-breakpoint
CREATE INDEX "milestones_review_due_idx" ON "milestones" USING btree ("status","review_due_at");--> statement-breakpoint
ALTER TABLE "escrow_ledger" ADD CONSTRAINT "escrow_ledger_idem_key_unique" UNIQUE("idem_key");--> statement-breakpoint
ALTER TABLE "review_requests" ADD CONSTRAINT "review_requests_contract_id_unique" UNIQUE("contract_id");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_contract_id_unique" UNIQUE("contract_id");--> statement-breakpoint
-- Existing money movements get their per-milestone keys (the first of each kind).
UPDATE "escrow_ledger" e SET "idem_key" = (CASE e."type" WHEN 'deposit' THEN 'dep:' WHEN 'release' THEN 'rel:' WHEN 'fee' THEN 'fee:' ELSE 'ref:' END) || e."milestone_id"::text
FROM (SELECT "id", row_number() OVER (PARTITION BY "milestone_id", "type" ORDER BY "id") AS rn FROM "escrow_ledger" WHERE "milestone_id" IS NOT NULL) x
WHERE x."id" = e."id" AND x.rn = 1;
--> statement-breakpoint
-- The ledger is append-only: an entry's money fields never change and entries
-- are never deleted (corrections are new entries). Only the provider status
-- and reference of an entry may be filled in later.
CREATE OR REPLACE FUNCTION sawwiq_ledger_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'escrow ledger is append-only';
  END IF;
  IF NEW.contract_id IS DISTINCT FROM OLD.contract_id
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.amount_fils IS DISTINCT FROM OLD.amount_fils
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (OLD.idem_key IS NOT NULL AND NEW.idem_key IS DISTINCT FROM OLD.idem_key)
     OR (OLD.milestone_id IS NOT NULL AND NEW.milestone_id IS DISTINCT FROM OLD.milestone_id) THEN
    RAISE EXCEPTION 'escrow ledger entries are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER escrow_ledger_append_only BEFORE UPDATE OR DELETE ON "escrow_ledger" FOR EACH ROW EXECUTE FUNCTION sawwiq_ledger_append_only();
