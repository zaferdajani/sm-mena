CREATE TABLE "portfolio_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"name" text NOT NULL,
	"industry" text,
	"country" text,
	"description" text DEFAULT '' NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "serves_countries" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "about" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "agencies" ADD COLUMN "strengths" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "portfolio_clients" ADD CONSTRAINT "portfolio_clients_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portfolio_clients_agency_idx" ON "portfolio_clients" USING btree ("agency_id","position");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_client_id_portfolio_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."portfolio_clients"("id") ON DELETE set null ON UPDATE no action;