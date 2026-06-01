-- Migration 0003: identity unification — additive phase.
-- Idempotent: every statement uses IF NOT EXISTS / guarded patterns.
-- Safe to run repeatedly. Touches no existing row values except backfilling
-- the new nullable user_id columns from the existing auth_id join.
-- NOTE: every statement is single (no DO $$ blocks) and ends with one ';' with
-- NO internal semicolons, because scripts/migrate-local.mjs splits files on ';'.
-- Nullable uniqueness is enforced via CREATE UNIQUE INDEX IF NOT EXISTS (a
-- unique index permits multiple NULLs, same as a UNIQUE constraint) which IS
-- idempotent — unlike ADD CONSTRAINT UNIQUE, which is not.

-- 1. user_profiles: provider-subject columns + email_verified.
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "google_sub" text;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "apple_sub" text;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_google_sub_key" ON "user_profiles" ("google_sub");
CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_apple_sub_key" ON "user_profiles" ("apple_sub");

-- 2. coin_events: add user_id, backfill from auth_id join.
ALTER TABLE "coin_events" ADD COLUMN IF NOT EXISTS "user_id" uuid;
UPDATE "coin_events" c SET "user_id" = p."id" FROM "user_profiles" p WHERE p."auth_id" = c."auth_id" AND c."user_id" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_coin_events_user_date2" ON "coin_events" ("user_id", "granted_at");

-- 3. dividend_collections: add user_id, backfill.
ALTER TABLE "dividend_collections" ADD COLUMN IF NOT EXISTS "user_id" uuid;
UPDATE "dividend_collections" d SET "user_id" = p."id" FROM "user_profiles" p WHERE p."auth_id" = d."auth_id" AND d."user_id" IS NULL;

-- 4. referrals: add referee_user_id + referrer_user_id, backfill both.
ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "referee_user_id" uuid;
ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "referrer_user_id" uuid;
UPDATE "referrals" r SET "referee_user_id" = p."id" FROM "user_profiles" p WHERE p."auth_id" = r."referee_auth_id" AND r."referee_user_id" IS NULL;
UPDATE "referrals" r SET "referrer_user_id" = p."id" FROM "user_profiles" p WHERE p."auth_id" = r."referrer_auth_id" AND r."referrer_user_id" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_referrals_referrer_uid" ON "referrals" ("referrer_user_id");
