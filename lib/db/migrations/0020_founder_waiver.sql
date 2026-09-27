ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "founder_waiver" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contracts_founder_waiver_idx" ON "contracts" USING btree ("agency_id") WHERE "contracts"."founder_waiver" and "contracts"."status" <> 'cancelled';
