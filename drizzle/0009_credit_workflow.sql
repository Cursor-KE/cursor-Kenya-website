DO $$ BEGIN
  CREATE TYPE "credit_provider_status" AS ENUM ('active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "credit_campaign_status" AS ENUM ('draft', 'active', 'paused', 'ended', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "credit_guest_status" AS ENUM ('eligible', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "credit_inventory_status" AS ENUM ('available', 'claimed', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "credit_import_kind" AS ENUM ('guests', 'inventory', 'luma_guests');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "credit_providers" (
  "id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "slug" text NOT NULL UNIQUE,
  "status" credit_provider_status DEFAULT 'active' NOT NULL, "description" text,
  "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "credit_providers_status_idx" ON "credit_providers" ("status");

CREATE TABLE IF NOT EXISTS "credit_campaigns" (
  "id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "slug" text NOT NULL UNIQUE,
  "description" text, "status" credit_campaign_status DEFAULT 'draft' NOT NULL,
  "claim_starts_at" timestamptz, "claim_ends_at" timestamptz,
  "luma_event_id" text REFERENCES "luma_events"("id") ON DELETE RESTRICT,
  "created_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "credit_campaigns_status_idx" ON "credit_campaigns" ("status");
CREATE INDEX IF NOT EXISTS "credit_campaigns_luma_event_idx" ON "credit_campaigns" ("luma_event_id");

CREATE TABLE IF NOT EXISTS "credit_campaign_providers" (
  "id" text PRIMARY KEY NOT NULL,
  "campaign_id" text NOT NULL REFERENCES "credit_campaigns"("id") ON DELETE RESTRICT,
  "provider_id" text NOT NULL REFERENCES "credit_providers"("id") ON DELETE RESTRICT,
  "active" boolean DEFAULT true NOT NULL, "public_instructions" text,
  "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "credit_campaign_provider_unique" ON "credit_campaign_providers" ("campaign_id", "provider_id");
CREATE INDEX IF NOT EXISTS "credit_campaign_providers_campaign_idx" ON "credit_campaign_providers" ("campaign_id");

CREATE TABLE IF NOT EXISTS "credit_guests" (
  "id" text PRIMARY KEY NOT NULL,
  "campaign_id" text NOT NULL REFERENCES "credit_campaigns"("id") ON DELETE RESTRICT,
  "email" text NOT NULL, "normalized_email" text NOT NULL, "name" text, "external_id" text,
  "eligibility_status" credit_guest_status DEFAULT 'eligible' NOT NULL,
  "source" text DEFAULT 'manual' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "credit_guest_campaign_email_unique" ON "credit_guests" ("campaign_id", "normalized_email");
CREATE INDEX IF NOT EXISTS "credit_guests_campaign_status_idx" ON "credit_guests" ("campaign_id", "eligibility_status");

CREATE TABLE IF NOT EXISTS "credit_inventory" (
  "id" text PRIMARY KEY NOT NULL,
  "provider_id" text NOT NULL REFERENCES "credit_providers"("id") ON DELETE RESTRICT,
  "campaign_provider_id" text REFERENCES "credit_campaign_providers"("id") ON DELETE RESTRICT,
  "fingerprint" text NOT NULL UNIQUE, "encrypted_value" text NOT NULL, "masked_value" text NOT NULL,
  "label" text, "expires_at" timestamptz,
  "status" credit_inventory_status DEFAULT 'available' NOT NULL,
  "created_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "claimed_at" timestamptz, "revoked_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL, "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "credit_inventory_allocation_status_idx" ON "credit_inventory" ("campaign_provider_id", "status");
CREATE INDEX IF NOT EXISTS "credit_inventory_provider_idx" ON "credit_inventory" ("provider_id");

CREATE TABLE IF NOT EXISTS "credit_claims" (
  "id" text PRIMARY KEY NOT NULL,
  "campaign_provider_id" text NOT NULL REFERENCES "credit_campaign_providers"("id") ON DELETE RESTRICT,
  "guest_id" text NOT NULL REFERENCES "credit_guests"("id") ON DELETE RESTRICT,
  "inventory_id" text NOT NULL REFERENCES "credit_inventory"("id") ON DELETE RESTRICT,
  "claimed_at" timestamptz DEFAULT now() NOT NULL, "redeemed_at" timestamptz, "revoked_at" timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS "credit_claim_inventory_unique" ON "credit_claims" ("inventory_id");
CREATE UNIQUE INDEX IF NOT EXISTS "credit_claim_guest_allocation_unique" ON "credit_claims" ("campaign_provider_id", "guest_id");
CREATE INDEX IF NOT EXISTS "credit_claims_claimed_at_idx" ON "credit_claims" ("claimed_at");

CREATE TABLE IF NOT EXISTS "credit_imports" (
  "id" text PRIMARY KEY NOT NULL, "kind" credit_import_kind NOT NULL,
  "campaign_id" text REFERENCES "credit_campaigns"("id") ON DELETE RESTRICT,
  "provider_id" text REFERENCES "credit_providers"("id") ON DELETE RESTRICT,
  "campaign_provider_id" text REFERENCES "credit_campaign_providers"("id") ON DELETE RESTRICT,
  "created_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "summary" jsonb NOT NULL, "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "credit_audit_log" (
  "id" text PRIMARY KEY NOT NULL, "actor_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "action" text NOT NULL, "entity_type" text NOT NULL, "entity_id" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL, "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "credit_audit_entity_idx" ON "credit_audit_log" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "credit_audit_created_at_idx" ON "credit_audit_log" ("created_at");

CREATE TABLE IF NOT EXISTS "credit_verifications" (
  "id" text PRIMARY KEY NOT NULL,
  "campaign_id" text NOT NULL REFERENCES "credit_campaigns"("id") ON DELETE CASCADE,
  "normalized_email" text NOT NULL, "code_hash" text NOT NULL, "ip_hash" text NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL, "expires_at" timestamptz NOT NULL,
  "verified_at" timestamptz, "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "credit_verification_email_created_idx" ON "credit_verifications" ("campaign_id", "normalized_email", "created_at");
CREATE INDEX IF NOT EXISTS "credit_verification_ip_created_idx" ON "credit_verifications" ("ip_hash", "created_at");

INSERT INTO "credit_providers" ("id", "name", "slug", "description")
VALUES ('provider_cursor', 'Cursor', 'cursor', 'Default Cursor credit provider')
ON CONFLICT ("slug") DO NOTHING;
