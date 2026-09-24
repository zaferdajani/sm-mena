CREATE TABLE "ndas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"agency_id" uuid NOT NULL,
	"locale" text DEFAULT 'ar' NOT NULL,
	"direction" text DEFAULT 'mutual' NOT NULL,
	"purpose" text NOT NULL,
	"years" integer DEFAULT 2 NOT NULL,
	"jurisdiction" text NOT NULL,
	"jurisdiction_city" text NOT NULL,
	"legal_version" text NOT NULL,
	"agency_legal_name" text NOT NULL,
	"agency_reg_number" text,
	"agency_terms" text,
	"client_terms" text,
	"client_name" text NOT NULL,
	"client_phone" text NOT NULL,
	"client_email" text,
	"client_reg_number" text,
	"client_token_hash" text NOT NULL,
	"client_token_enc" text NOT NULL,
	"terms_hash" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"agency_signer_name" text NOT NULL,
	"agency_signed_at" timestamp with time zone NOT NULL,
	"agency_signature" text NOT NULL,
	"agency_sign_ip_hash" text,
	"client_signer_name" text,
	"client_signed_at" timestamp with time zone,
	"client_signature" text,
	"client_sign_ip_hash" text,
	"client_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ndas_number_unique" UNIQUE("number"),
	CONSTRAINT "ndas_client_token_hash_unique" UNIQUE("client_token_hash")
);
--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "jurisdiction" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "jurisdiction_city" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "legal_version" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "agency_legal_name" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "agency_reg_number" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "client_reg_number" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "agency_terms" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "client_terms" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "nda_years" integer;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "agency_signature" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "agency_sign_ip_hash" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "client_signature" text;--> statement-breakpoint
ALTER TABLE "ndas" ADD CONSTRAINT "ndas_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ndas_agency_idx" ON "ndas" USING btree ("agency_id","created_at");--> statement-breakpoint
-- Signed documents are frozen: once a party has signed, its name, time,
-- drawn signature and the signed terms fingerprint can never change.
CREATE OR REPLACE FUNCTION sawwiq_freeze_signatures() RETURNS trigger AS $$
BEGIN
  IF NEW.terms_hash IS DISTINCT FROM OLD.terms_hash THEN
    RAISE EXCEPTION 'signed terms are frozen';
  END IF;
  IF NEW.agency_signer_name IS DISTINCT FROM OLD.agency_signer_name
     OR NEW.agency_signed_at IS DISTINCT FROM OLD.agency_signed_at
     OR (OLD.agency_signature IS NOT NULL AND NEW.agency_signature IS DISTINCT FROM OLD.agency_signature) THEN
    RAISE EXCEPTION 'agency signature is frozen';
  END IF;
  IF OLD.client_signed_at IS NOT NULL AND (
       NEW.client_signer_name IS DISTINCT FROM OLD.client_signer_name
       OR NEW.client_signed_at IS DISTINCT FROM OLD.client_signed_at
       OR NEW.client_signature IS DISTINCT FROM OLD.client_signature
       OR NEW.client_sign_ip_hash IS DISTINCT FROM OLD.client_sign_ip_hash) THEN
    RAISE EXCEPTION 'client signature is frozen';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER contracts_freeze_signatures BEFORE UPDATE ON "contracts" FOR EACH ROW EXECUTE FUNCTION sawwiq_freeze_signatures();
--> statement-breakpoint
CREATE TRIGGER ndas_freeze_signatures BEFORE UPDATE ON "ndas" FOR EACH ROW EXECUTE FUNCTION sawwiq_freeze_signatures();
