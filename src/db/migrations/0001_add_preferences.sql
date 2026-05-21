-- Migration: add user_profiles.preferences JSONB column
-- Run manually against Neon via psql or the Neon console.
ALTER TABLE "user_profiles" ADD COLUMN "preferences" jsonb;
