-- Paper-trading currency: virtual_balance on user_profiles.
-- Keeps simulator cash separate from game `coins` (which fund shop, repair,
-- streak, etc.). 100,000 is the standard paper-trading starting bankroll.
-- Existing rows are seeded by DEFAULT — no separate backfill needed.

ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "virtual_balance" numeric(18, 2) NOT NULL DEFAULT 100000;
