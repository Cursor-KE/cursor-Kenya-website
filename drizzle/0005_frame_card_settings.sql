CREATE TABLE "frame_card_settings" (
  "id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
  "title" text DEFAULT '/Nairobi Meetup' NOT NULL,
  "published" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "frame_card_settings" ("id", "title", "published")
VALUES ('default', '/Nairobi Meetup', false)
ON CONFLICT ("id") DO NOTHING;
