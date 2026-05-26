-- Migration: add user_profiles.preferences JSONB column
-- Idempotent — safe to run repeatedly (used by `npm run dev:local`, psql, or Neon console).
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "preferences" jsonb;
