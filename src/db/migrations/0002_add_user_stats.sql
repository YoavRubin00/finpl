-- Migration: add user_stats table
-- Idempotent — safe to run repeatedly (used by `npm run dev:local`, psql, or Neon console).
CREATE TABLE IF NOT EXISTS "user_stats" (
  "user_id" uuid PRIMARY KEY,
  "total_session_seconds" integer NOT NULL DEFAULT 0,
  "module_durations" jsonb DEFAULT '{}'::jsonb,
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "user_stats_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE
);
