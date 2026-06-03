-- Migration 0005: parental_consents — track parental consent for users
-- aged 16-17 (ageGroup='minor') who want to purchase Pro subscriptions.
-- Israeli Capacity Act sec. 4-6 requires explicit parental consent for any
-- ongoing transaction by a minor; this table records the consent + audit
-- trail so a parent can later revoke and we can prove consent at the
-- moment of purchase.
--
-- Lifecycle:
--   request → row inserted with status='pending', token + expires_at set
--   parent clicks email link → status='confirmed', confirmed_at, ip
--   parent later clicks revoke link → status='revoked', revoked_at
--   if 14 days pass without confirmation → background job marks 'expired'
--
-- Idempotent: re-running this migration is a no-op.

CREATE TABLE IF NOT EXISTS "parental_consents" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL,
  "parent_email" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "requested_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "confirmed_at" TIMESTAMPTZ,
  "revoked_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  "ip_when_requested" TEXT,
  "ip_when_confirmed" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FK to user_profiles; cascade delete so account-delete (P1-3) cleans up.
ALTER TABLE "parental_consents"
  DROP CONSTRAINT IF EXISTS "parental_consents_user_fk";
ALTER TABLE "parental_consents"
  ADD CONSTRAINT "parental_consents_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE;

-- Status must be one of the four lifecycle values.
ALTER TABLE "parental_consents"
  DROP CONSTRAINT IF EXISTS "parental_consents_status_check";
ALTER TABLE "parental_consents"
  ADD CONSTRAINT "parental_consents_status_check"
  CHECK ("status" IN ('pending', 'confirmed', 'revoked', 'expired'));

-- Token is the random secret embedded in the email link — must be unique.
CREATE UNIQUE INDEX IF NOT EXISTS "parental_consents_token_uniq"
  ON "parental_consents" ("token");

-- Fast lookup of "does this user have an active consent?" — covers status
-- and expires_at so the planner can answer the question from the index.
CREATE INDEX IF NOT EXISTS "parental_consents_user_active_idx"
  ON "parental_consents" ("user_id", "status", "expires_at");
