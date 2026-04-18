CREATE TABLE "showcase_ai_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"showcase_id" text NOT NULL,
	"status_at_review" "showcase_status" NOT NULL,
	"prompt_version" text NOT NULL,
	"model" text NOT NULL,
	"validation_signals" jsonb NOT NULL,
	"review_json" jsonb NOT NULL,
	"policy_outcome" jsonb NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showcase_ai_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"showcase_id" text NOT NULL,
	"review_id" text NOT NULL,
	"action" text NOT NULL,
	"action_source" text NOT NULL,
	"policy_snapshot" jsonb NOT NULL,
	"executed_by_user_id" text,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"success" boolean NOT NULL,
	"failure_reason" text,
	"pre_action_status" "showcase_status" NOT NULL,
	"post_action_status" "showcase_status"
);
--> statement-breakpoint
ALTER TABLE "showcase_ai_reviews" ADD CONSTRAINT "showcase_ai_reviews_showcase_id_community_showcase_id_fk" FOREIGN KEY ("showcase_id") REFERENCES "public"."community_showcase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showcase_ai_actions" ADD CONSTRAINT "showcase_ai_actions_showcase_id_community_showcase_id_fk" FOREIGN KEY ("showcase_id") REFERENCES "public"."community_showcase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showcase_ai_actions" ADD CONSTRAINT "showcase_ai_actions_review_id_showcase_ai_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."showcase_ai_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "showcase_ai_reviews_showcase_id_idx" ON "showcase_ai_reviews" USING btree ("showcase_id");--> statement-breakpoint
CREATE INDEX "showcase_ai_reviews_created_at_idx" ON "showcase_ai_reviews" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "showcase_ai_actions_showcase_id_idx" ON "showcase_ai_actions" USING btree ("showcase_id");--> statement-breakpoint
CREATE INDEX "showcase_ai_actions_review_id_idx" ON "showcase_ai_actions" USING btree ("review_id");
