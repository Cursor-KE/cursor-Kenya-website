CREATE TABLE IF NOT EXISTS "luma_guests" (
  "id" text PRIMARY KEY NOT NULL,
  "event_id" text NOT NULL,
  "user_id" text,
  "email" text,
  "name" text,
  "first_name" text,
  "last_name" text,
  "approval_status" text,
  "phone_number" text,
  "registered_at" timestamp with time zone,
  "checked_in_at" timestamp with time zone,
  "raw_payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "luma_guests_event_id_idx" ON "luma_guests" ("event_id");
CREATE INDEX IF NOT EXISTS "luma_guests_email_idx" ON "luma_guests" ("email");
CREATE INDEX IF NOT EXISTS "luma_guests_approval_status_idx" ON "luma_guests" ("approval_status");
CREATE INDEX IF NOT EXISTS "luma_guests_registered_at_idx" ON "luma_guests" ("registered_at");

CREATE TABLE IF NOT EXISTS "luma_tickets" (
  "id" text PRIMARY KEY NOT NULL,
  "event_id" text NOT NULL,
  "guest_id" text,
  "ticket_type_id" text,
  "name" text,
  "amount" integer,
  "currency" text,
  "checked_in_at" timestamp with time zone,
  "raw_payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "luma_tickets_event_id_idx" ON "luma_tickets" ("event_id");
CREATE INDEX IF NOT EXISTS "luma_tickets_guest_id_idx" ON "luma_tickets" ("guest_id");
CREATE INDEX IF NOT EXISTS "luma_tickets_checked_in_at_idx" ON "luma_tickets" ("checked_in_at");
