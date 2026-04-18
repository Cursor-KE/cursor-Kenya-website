CREATE TYPE "public"."admin_role" AS ENUM('super_user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."admin_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" "admin_role" DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "admin_status" "admin_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "approved_by_user_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "user_admin_status_idx" ON "user" USING btree ("admin_status");--> statement-breakpoint
UPDATE "user"
SET
  "role" = 'super_user',
  "admin_status" = 'approved',
  "approved_at" = COALESCE("approved_at", now())
WHERE lower("email") = 'felixkent360@gmail.com';--> statement-breakpoint
UPDATE "user"
SET
  "role" = 'admin',
  "admin_status" = 'approved',
  "approved_at" = COALESCE("approved_at", now())
WHERE lower("email") <> 'felixkent360@gmail.com' AND "admin_status" = 'pending';
