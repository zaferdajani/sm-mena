CREATE TYPE "public"."contract_status" AS ENUM('sent', 'active', 'completed', 'cancelled', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."ledger_type" AS ENUM('deposit', 'release', 'refund', 'fee');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('pending', 'funded', 'submitted', 'changes_requested', 'approved', 'released', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('protected', 'direct');--> statement-breakpoint
CREATE TABLE "contract_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"contract_id" uuid NOT NULL,
	"actor" text NOT NULL,
	"type" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"agency_id" uuid NOT NULL,
	"request_id" uuid,
	"proposal_id" uuid,
	"package_id" uuid,
	"locale" text DEFAULT 'ar' NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"special_requests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"total_fils" integer NOT NULL,
	"fee_percent" real DEFAULT 0 NOT NULL,
	"payment_mode" "payment_mode" NOT NULL,
	"nda" boolean DEFAULT false NOT NULL,
	"nda_extra" text,
	"status" "contract_status" DEFAULT 'sent' NOT NULL,
	"client_name" text NOT NULL,
	"client_phone" text NOT NULL,
	"client_email" text,
	"client_token_hash" text NOT NULL,
	"client_token_enc" text NOT NULL,
	"terms_hash" text NOT NULL,
	"agency_signer_name" text NOT NULL,
	"agency_signed_at" timestamp with time zone NOT NULL,
	"client_signer_name" text,
	"client_signed_at" timestamp with time zone,
	"client_sign_ip_hash" text,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_number_unique" UNIQUE("number"),
	CONSTRAINT "contracts_client_token_hash_unique" UNIQUE("client_token_hash")
);
--> statement-breakpoint
CREATE TABLE "escrow_ledger" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"contract_id" uuid NOT NULL,
	"milestone_id" uuid,
	"type" "ledger_type" NOT NULL,
	"amount_fils" integer NOT NULL,
	"status" text DEFAULT 'succeeded' NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestone_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"milestone_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"text" text NOT NULL,
	"source" text NOT NULL,
	"done_by_agency" boolean DEFAULT false NOT NULL,
	"confirmed_by_client" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"due_date" text NOT NULL,
	"amount_fils" integer NOT NULL,
	"status" "milestone_status" DEFAULT 'pending' NOT NULL,
	"submission_note" text,
	"changes_note" text,
	"client_paid_direct" boolean DEFAULT false NOT NULL,
	"agency_confirmed_paid" boolean DEFAULT false NOT NULL,
	"funded_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"released_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "items" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "delivery_days" integer;--> statement-breakpoint
ALTER TABLE "contract_events" ADD CONSTRAINT "contract_events_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_request_id_project_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."project_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_ledger" ADD CONSTRAINT "escrow_ledger_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_ledger" ADD CONSTRAINT "escrow_ledger_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_checks" ADD CONSTRAINT "milestone_checks_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contract_events_idx" ON "contract_events" USING btree ("contract_id","created_at");--> statement-breakpoint
CREATE INDEX "contracts_agency_idx" ON "contracts" USING btree ("agency_id","created_at");--> statement-breakpoint
CREATE INDEX "contracts_status_idx" ON "contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "escrow_contract_idx" ON "escrow_ledger" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "escrow_type_idx" ON "escrow_ledger" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX "milestone_checks_idx" ON "milestone_checks" USING btree ("milestone_id","position");--> statement-breakpoint
CREATE INDEX "milestones_contract_idx" ON "milestones" USING btree ("contract_id","position");