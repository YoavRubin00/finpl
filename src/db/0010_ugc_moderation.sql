-- 0010: UGC moderation (Apple App Store Guideline 1.2) — report content + block
-- users + server-side hide. The 1.4.2 community portfolio feed is the first
-- cross-user UGC surface (shares + comments), so Apple requires: a way to flag
-- objectionable content, a way to block abusive users, and the ability to remove
-- content. These tables + the `hidden` flags provide exactly that.
--
-- Additive + idempotent. MUST run AFTER 0009 (it ALTERs shared_portfolios /
-- portfolio_comments, which 0009 creates). Run manually against prod DATABASE_URL.

-- A moderator/threshold can hide any item; the feed query filters hidden=false.
ALTER TABLE shared_portfolios  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
ALTER TABLE portfolio_comments ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- Reports — one per reporter per target (anti-spam). target_type is constrained
-- so a report always points at a real, known surface.
CREATE TABLE IF NOT EXISTS content_reports (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_user_id  uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reporter_auth_id  varchar(254) NOT NULL,
  target_type       varchar(16)  NOT NULL,        -- 'portfolio' | 'comment'
  target_id         uuid         NOT NULL,
  reason            varchar(300),
  created_at        timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT content_reports_target_type_chk CHECK (target_type IN ('portfolio','comment')),
  CONSTRAINT content_reports_one_per_reporter UNIQUE (reporter_user_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS content_reports_target_idx ON content_reports (target_type, target_id);

-- Blocks — a blocker never sees the blocked user's shares or comments again.
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_user_id  uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  blocked_user_id  uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_user_id, blocked_user_id),
  CONSTRAINT user_blocks_not_self CHECK (blocker_user_id <> blocked_user_id)
);
CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx ON user_blocks (blocker_user_id);
