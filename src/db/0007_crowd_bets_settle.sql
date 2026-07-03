-- Settle + payout ledger for crowd_bets (parimutuel peer-to-peer prediction).
-- All columns nullable → NON-BREAKING for existing 'pending' rows.
-- Run manually against prod Neon (repo migrations are applied out-of-band).

ALTER TABLE crowd_bets ADD COLUMN IF NOT EXISTS payout integer;
ALTER TABLE crowd_bets ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
ALTER TABLE crowd_bets ADD COLUMN IF NOT EXISTS winning_choice_id text;
ALTER TABLE crowd_bets ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- Fast lookup of a user's settled-but-unclaimed predictions (claim-on-open).
CREATE INDEX IF NOT EXISTS idx_crowd_bets_user_unclaimed
  ON crowd_bets (user_id)
  WHERE status IN ('won', 'refunded') AND claimed_at IS NULL;
