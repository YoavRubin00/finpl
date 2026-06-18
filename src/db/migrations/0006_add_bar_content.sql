-- Bar (marketing) cloud-managed content: knowledge tips, binary VS polls, CTA
-- copy. Bar's morning routine upserts rows via POST /api/bar/content; the app
-- reads by type via GET /api/bar/content. VS votes still live in
-- crowd_question_votes. Run before the /api/bar/content endpoint goes live.

CREATE TABLE IF NOT EXISTS "bar_content" (
  "id" serial PRIMARY KEY NOT NULL,
  "content_type" text NOT NULL,
  "content_key" text NOT NULL,
  "payload" jsonb NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "date_key" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "bar_content_type_key_uniq" UNIQUE ("content_type", "content_key"),
  CONSTRAINT "bar_content_type_check" CHECK (content_type IN ('tip', 'poll', 'cta'))
);

CREATE INDEX IF NOT EXISTS "idx_bar_content_type_active"
  ON "bar_content" USING btree ("content_type", "active", "date_key" DESC);
