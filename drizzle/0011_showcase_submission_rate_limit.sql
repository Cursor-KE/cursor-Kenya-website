ALTER TABLE "community_showcase"
  ADD COLUMN IF NOT EXISTS "submitter_ip_hash" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_showcase_builder_email_created_at_idx"
  ON "community_showcase" USING btree ("builder_email", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_showcase_submitter_ip_created_at_idx"
  ON "community_showcase" USING btree ("submitter_ip_hash", "created_at");
