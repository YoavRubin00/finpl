-- FK consistency pass: convert text user_id columns to proper uuid FKs.
-- See journal note in src/db/meta/_journal.json — this file is informational.
-- Apply manually on Neon (the team writes SQL on the DB and mirrors back into schema.ts).
--
-- Idempotent where it can be (IF NOT EXISTS, IF EXISTS). The body is wrapped
-- in a single transaction so a failure leaves nothing half-applied.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. user_feedback.user_id  text → uuid (nullable, FK ON DELETE CASCADE)
--    Existing rows store a mix of UUIDs (resolved authId), raw authId strings
--    (fallback), and 'guest'. Backfill what we can; orphans become NULL.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "user_feedback" ADD COLUMN IF NOT EXISTS "user_id_new" uuid;

UPDATE "user_feedback" uf
   SET "user_id_new" = up."id"
  FROM "user_profiles" up
 WHERE uf."user_id_new" IS NULL
   AND (
        -- already-UUID rows (cast safely; non-UUIDs raise, so guard with regex)
        (uf."user_id" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         AND uf."user_id"::uuid = up."id")
        -- raw authId fallback rows
     OR uf."user_id" = up."auth_id"
   );

ALTER TABLE "user_feedback" DROP COLUMN "user_id";
ALTER TABLE "user_feedback" RENAME COLUMN "user_id_new" TO "user_id";

ALTER TABLE "user_feedback"
  ADD CONSTRAINT "user_feedback_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_user_feedback_user"
  ON "user_feedback" USING btree ("user_id");

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. crowd_question_votes.user_id  text → uuid (NOT NULL, FK ON DELETE CASCADE)
--    Vote API has always inserted user_profiles.id (UUID), so a direct cast is
--    safe. Drop the unique constraint first because it depends on the type.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "crowd_question_votes"
  DROP CONSTRAINT IF EXISTS "crowd_question_votes_user_date_key";

ALTER TABLE "crowd_question_votes"
  ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;

ALTER TABLE "crowd_question_votes"
  ADD CONSTRAINT "crowd_question_votes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE;

ALTER TABLE "crowd_question_votes"
  ADD CONSTRAINT "crowd_question_votes_user_date_key"
  UNIQUE ("user_id", "vote_date_il");

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. bridge_clicks: ADD user_id alongside user_email.
--    Anonymous clicks remain supported (user_id NULL). user_email is kept
--    because the owner-alert email body at track-click+api.ts:31 references it.
--    ON DELETE SET NULL preserves analytics rows when a user is deleted.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "bridge_clicks" ADD COLUMN IF NOT EXISTS "user_id" uuid;

UPDATE "bridge_clicks" bc
   SET "user_id" = up."id"
  FROM "user_profiles" up
 WHERE bc."user_id" IS NULL
   AND bc."user_email" IS NOT NULL
   AND LOWER(bc."user_email") = LOWER(up."email");

ALTER TABLE "bridge_clicks"
  ADD CONSTRAINT "bridge_clicks_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_bridge_clicks_user"
  ON "bridge_clicks" USING btree ("user_id");

COMMIT;
