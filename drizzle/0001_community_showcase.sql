CREATE TYPE "public"."showcase_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "community_showcase" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"project_url" text NOT NULL,
	"repo_url" text,
	"builder_name" text NOT NULL,
	"builder_email" text NOT NULL,
	"screenshot_urls" jsonb NOT NULL,
	"status" "showcase_status" DEFAULT 'pending' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "community_showcase_status_idx" ON "community_showcase" USING btree ("status");--> statement-breakpoint
CREATE INDEX "community_showcase_featured_sort_idx" ON "community_showcase" USING btree ("featured","sort_order");