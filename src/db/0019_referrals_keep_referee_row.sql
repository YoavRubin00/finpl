-- 0019_referrals_keep_referee_row.sql — account deletion (2026-11-20). NOT YET APPLIED.
--
-- When a REFERRER deletes their account, the referral rows of the friends they
-- invited used to disappear with it (referrals_referrer_fk ON DELETE CASCADE).
-- That freed those friends' one-time redemption (the PK on referee_user_id),
-- so each of them could redeem a second invite and collect the 500-coin
-- signup bonus again. After this migration the row stays, anonymised:
-- referrer_user_id becomes NULL (POST /api/account/delete also sets
-- invite_code = 'DELETED'), nothing about the deleted user remains, and the
-- friend still counts as "already redeemed".
--
-- Readers are unaffected: /api/referral/me and /collect select
-- `WHERE referrer_user_id = <caller>`, which never matches NULL. The CHECK
-- referrer_user_id <> referee_user_id passes for NULL.
--
-- The code is safe before and after: api/_shared/accountDeleteStore.ts reads
-- information_schema and, while the column is still NOT NULL, deletes those
-- rows (what the cascade did) instead of anonymising them.
--
-- Additive, idempotent, one short transaction (ALTER takes a brief lock on
-- referrals, a small table). Run manually against the production
-- DATABASE_URL, any time (before or after the server deploy):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f src/db/0019_referrals_keep_referee_row.sql
-- (NOT drizzle-kit push — known schema drift.) Or paste it into the Neon SQL
-- editor.

BEGIN;

ALTER TABLE "referrals" ALTER COLUMN "referrer_user_id" DROP NOT NULL;

ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "referrals_referrer_fk";
ALTER TABLE "referrals"
  ADD CONSTRAINT "referrals_referrer_fk"
  FOREIGN KEY ("referrer_user_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL;

COMMIT;
