CREATE TYPE "public"."change_status" AS ENUM('pending', 'accepted', 'declined', 'withdrawn');--> statement-breakpoint
CREATE TABLE "contract_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"title" text NOT NULL,
	"reason" text NOT NULL,
	"amount_fils" integer NOT NULL,
	"due_date" text NOT NULL,
	"checks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "change_status" DEFAULT 'pending' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"milestone_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "terms_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "kpis" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "reporting_cadence" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "media_budget_jod" integer;--> statement-breakpoint
ALTER TABLE "project_requests" ADD COLUMN "full_service" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project_requests" ADD COLUMN "brands" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "results" integer;--> statement-breakpoint
ALTER TABLE "contract_changes" ADD CONSTRAINT "contract_changes_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contract_changes_idx" ON "contract_changes" USING btree ("contract_id","created_at");