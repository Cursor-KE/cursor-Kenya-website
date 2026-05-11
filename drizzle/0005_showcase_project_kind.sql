ALTER TABLE "community_showcase" ADD COLUMN IF NOT EXISTS "project_kind" text NOT NULL DEFAULT 'other';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_showcase_status_project_kind_idx" ON "community_showcase" USING btree ("status","project_kind");
