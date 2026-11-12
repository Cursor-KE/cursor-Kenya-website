CREATE INDEX IF NOT EXISTS "form_responses_rate_limit_idx"
  ON "form_responses" ("form_id", ((submitter_meta->>'ip_hash')), "created_at");
