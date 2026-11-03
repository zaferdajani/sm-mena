CREATE TABLE "consent_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"kind" text NOT NULL,
	"policy_version" text NOT NULL,
	"granted" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_log_user_idx" ON "consent_log" USING btree ("user_id","created_at");