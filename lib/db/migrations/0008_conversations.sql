CREATE TYPE "public"."conversation_status" AS ENUM('open', 'closed', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."message_side" AS ENUM('client', 'agency', 'system', 'staff');--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"side" "message_side" NOT NULL,
	"sender_user_id" uuid,
	"sender_visitor_id" text,
	"body" text NOT NULL,
	"ip_hash" text,
	"hidden_at" timestamp with time zone,
	"hidden_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_messages_body_length" CHECK (char_length("conversation_messages"."body") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"request_id" uuid,
	"proposal_id" uuid,
	"inquiry_id" uuid,
	"client_visitor_id" text,
	"client_name" text NOT NULL,
	"status" "conversation_status" DEFAULT 'open' NOT NULL,
	"notice_version" text NOT NULL,
	"last_message_id" bigint DEFAULT 0 NOT NULL,
	"last_message_at" timestamp with time zone,
	"agency_last_read_id" bigint DEFAULT 0 NOT NULL,
	"client_last_read_id" bigint DEFAULT 0 NOT NULL,
	"agency_emailed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"agency_id" uuid,
	"visitor_id" text,
	"request_id" uuid,
	"conversation_id" uuid,
	"kind" text NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"href" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_hidden_by_users_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_request_id_project_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."project_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_request_id_project_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."project_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_messages_conversation_idx" ON "conversation_messages" USING btree ("conversation_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_request_agency_idx" ON "conversations" USING btree ("request_id","agency_id") WHERE "conversations"."request_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_inquiry_idx" ON "conversations" USING btree ("inquiry_id") WHERE "conversations"."inquiry_id" is not null;--> statement-breakpoint
CREATE INDEX "conversations_agency_idx" ON "conversations" USING btree ("agency_id","last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_visitor_idx" ON "conversations" USING btree ("client_visitor_id","last_message_at");--> statement-breakpoint
CREATE INDEX "notifications_agency_idx" ON "notifications" USING btree ("agency_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "notifications_visitor_idx" ON "notifications" USING btree ("visitor_id","read_at","created_at");--> statement-breakpoint
-- Chat messages are an append-only log (docs/23-chat-and-notifications.md):
-- nobody can edit what was said. Staff may only hide a message (hidden_at,
-- hidden_by), and deleting a user only clears sender_user_id. Rows can be
-- deleted once they pass the 24-month retention period, or when their
-- conversation itself is erased (an agency account deleted on request).
CREATE OR REPLACE FUNCTION sawwiq_chat_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.created_at < now() - interval '24 months'
       OR NOT EXISTS (SELECT 1 FROM conversations c WHERE c.id = OLD.conversation_id) THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'chat messages cannot be deleted';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.side IS DISTINCT FROM OLD.side
     OR NEW.sender_visitor_id IS DISTINCT FROM OLD.sender_visitor_id
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.ip_hash IS DISTINCT FROM OLD.ip_hash
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (NEW.sender_user_id IS DISTINCT FROM OLD.sender_user_id AND NEW.sender_user_id IS NOT NULL) THEN
    RAISE EXCEPTION 'chat messages cannot be edited';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER conversation_messages_append_only BEFORE UPDATE OR DELETE ON "conversation_messages" FOR EACH ROW EXECUTE FUNCTION sawwiq_chat_append_only();
