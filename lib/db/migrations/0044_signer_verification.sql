ALTER TABLE "contracts" ADD COLUMN "client_signer_email" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "client_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ndas" ADD COLUMN "client_signer_email" text;--> statement-breakpoint
ALTER TABLE "ndas" ADD COLUMN "client_verified_at" timestamp with time zone;