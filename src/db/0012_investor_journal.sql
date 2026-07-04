-- 0012_investor_journal.sql — "יומן משקיעים" events table (2026-07-04)
-- The current month's real macro events (earnings, rate decisions, CPI/jobs)
-- shown in the Investors Journal sheet on the learn screen. Rows are curated
-- and VERIFIED by Waren before insert (Yoav: no event ships unverified), and
-- updated from the cloud (X-Bar-Token) — no OTA needed for content changes.
-- Idempotent: safe to run more than once.

CREATE TABLE IF NOT EXISTS investor_journal_events (
  id text PRIMARY KEY,
  event_date date NOT NULL,
  country text NOT NULL,
  kind text NOT NULL,
  emoji text NOT NULL DEFAULT '📊',
  title text NOT NULL,
  teaser text NOT NULL DEFAULT '',
  explain_what text NOT NULL,
  explain_why_me text NOT NULL,
  explain_market text NOT NULL,
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  outcome smallint,
  outcome_note text,
  hidden boolean NOT NULL DEFAULT false,
  sort integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ije_country_chk CHECK (country IN ('us','il')),
  CONSTRAINT ije_kind_chk CHECK (kind IN ('earnings','rate','cpi','jobs','other')),
  CONSTRAINT ije_outcome_chk CHECK (outcome IS NULL OR outcome IN (0,1))
);

CREATE INDEX IF NOT EXISTS ije_month_idx ON investor_journal_events (event_date);
