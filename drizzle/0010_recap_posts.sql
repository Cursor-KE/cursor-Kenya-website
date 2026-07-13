DO $$ BEGIN
  CREATE TYPE "recap_status" AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "recap_posts" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "excerpt" text NOT NULL,
  "content" text NOT NULL,
  "cover_image_url" text,
  "status" recap_status DEFAULT 'draft' NOT NULL,
  "author_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "updated_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "published_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "recap_posts_status_published_idx" ON "recap_posts" ("status", "published_at");
CREATE INDEX IF NOT EXISTS "recap_posts_author_idx" ON "recap_posts" ("author_user_id");
