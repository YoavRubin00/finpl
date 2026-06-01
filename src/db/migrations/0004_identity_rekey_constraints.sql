-- Migration 0004: identity unification — constraints/cleanup phase (Phase C).
-- Run ONLY after phase B is proven and orphan counts are zero.
-- No DO blocks (the runner splits on semicolons after stripping comments).
-- Idempotency via DROP CONSTRAINT IF EXISTS then ADD CONSTRAINT; SET NOT NULL
-- and DROP COLUMN IF EXISTS are naturally idempotent.

-- coin_events: enforce user_id, add FK+cascade, drop auth_id.
ALTER TABLE "coin_events" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "coin_events" DROP CONSTRAINT IF EXISTS "coin_events_user_fk";
ALTER TABLE "coin_events" ADD CONSTRAINT "coin_events_user_fk" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "coin_events" DROP COLUMN IF EXISTS "auth_id";

-- dividend_collections: new PK (user_id, date_collected), FK+cascade, drop auth_id.
ALTER TABLE "dividend_collections" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "dividend_collections" DROP CONSTRAINT IF EXISTS "dividend_collections_pkey";
ALTER TABLE "dividend_collections" ADD CONSTRAINT "dividend_collections_pkey" PRIMARY KEY ("user_id", "date_collected");
ALTER TABLE "dividend_collections" DROP CONSTRAINT IF EXISTS "dividend_collections_user_fk";
ALTER TABLE "dividend_collections" ADD CONSTRAINT "dividend_collections_user_fk" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "dividend_collections" DROP COLUMN IF EXISTS "auth_id";

-- referrals: drop the auth-id check first (it depends on the columns we drop),
-- new PK (referee_user_id), FKs+cascade, drop the auth_id columns, re-add check.
ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "referrals_check";
ALTER TABLE "referrals" ALTER COLUMN "referee_user_id" SET NOT NULL;
ALTER TABLE "referrals" ALTER COLUMN "referrer_user_id" SET NOT NULL;
ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "referrals_pkey";
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("referee_user_id");
ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "referrals_referee_fk";
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_fk" FOREIGN KEY ("referee_user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "referrals_referrer_fk";
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referee_auth_id";
ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referrer_auth_id";
ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "referrals_uid_check";
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_uid_check" CHECK ("referrer_user_id" <> "referee_user_id");
