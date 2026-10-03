CREATE TABLE "owner_needs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"business_type" text,
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"timing" text NOT NULL,
	"whatsapp" text,
	"note" text,
	"locale" text DEFAULT 'ar' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_needs_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "owner_needs" ADD CONSTRAINT "owner_needs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "owner_needs_country_idx" ON "owner_needs" USING btree ("country","created_at");