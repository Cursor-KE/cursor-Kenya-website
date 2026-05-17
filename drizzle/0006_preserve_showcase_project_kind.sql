ALTER TABLE "community_showcase"
  ADD COLUMN IF NOT EXISTS "project_kind" text DEFAULT 'other' NOT NULL;
