CREATE TABLE "testimonials" (
  "id" text PRIMARY KEY NOT NULL,
  "form_id" text,
  "response_id" text,
  "block_id" text,
  "question" text,
  "quote" text NOT NULL,
  "attendee_name" text,
  "attendee_role" text,
  "published" boolean DEFAULT true NOT NULL,
  "featured" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "testimonials"
  ADD CONSTRAINT "testimonials_form_id_forms_id_fk"
  FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "testimonials"
  ADD CONSTRAINT "testimonials_response_id_form_responses_id_fk"
  FOREIGN KEY ("response_id") REFERENCES "public"."form_responses"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "testimonials_published_idx" ON "testimonials" USING btree ("published");
--> statement-breakpoint
CREATE INDEX "testimonials_featured_sort_idx" ON "testimonials" USING btree ("featured","sort_order");
--> statement-breakpoint
CREATE INDEX "testimonials_response_block_idx" ON "testimonials" USING btree ("response_id","block_id");
