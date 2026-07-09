-- 0014: sequenced retention-email drip (Yoav 2026-07-09).
-- Per-user counter of retention emails sent, so the Nth email is sequence
-- position N ("תזכורת מספר שלוש" arrives as the real 3rd email, not a random
-- first one). Backfilled to 0 for everyone — existing users simply restart the
-- ordered drip from the top on their next send, which is the desired behaviour.
-- Additive + idempotent — run manually against prod DATABASE_URL (NOT
-- drizzle-kit push — known schema drift).

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS daily_email_seq integer NOT NULL DEFAULT 0;
