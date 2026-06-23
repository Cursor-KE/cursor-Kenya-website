CREATE TABLE IF NOT EXISTS "luma_events" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "start_at" timestamp with time zone NOT NULL,
  "end_at" timestamp with time zone,
  "url" text NOT NULL,
  "cover_url" text,
  "status" text DEFAULT 'active' NOT NULL,
  "raw_payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "luma_events_start_at_idx" ON "luma_events" ("start_at");
CREATE INDEX IF NOT EXISTS "luma_events_status_idx" ON "luma_events" ("status");

CREATE TABLE IF NOT EXISTS "luma_webhook_deliveries" (
  "id" text PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL,
  "luma_object_id" text,
  "payload" jsonb NOT NULL,
  "status" text DEFAULT 'processing' NOT NULL,
  "error" text,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "luma_webhook_deliveries_event_type_idx" ON "luma_webhook_deliveries" ("event_type");
CREATE INDEX IF NOT EXISTS "luma_webhook_deliveries_object_idx" ON "luma_webhook_deliveries" ("luma_object_id");
CREATE INDEX IF NOT EXISTS "luma_webhook_deliveries_received_at_idx" ON "luma_webhook_deliveries" ("received_at");
