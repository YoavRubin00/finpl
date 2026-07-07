-- 0013: anonymous portfolio sharing (Yoav 2026-07-07).
-- The feed is now PUBLIC-READ (everyone, including guests, sees all shared
-- portfolios) and a sharer can post anonymously: the row keeps the real
-- user_id (moderation/blocks/CASCADE still work) but the API masks
-- name/avatar/author id in every response when is_anonymous is true.
-- Additive + idempotent — run manually against prod DATABASE_URL
-- (NOT drizzle-kit push — known schema drift).

ALTER TABLE shared_portfolios
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;
