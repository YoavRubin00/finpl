-- 0008: real friend graph (Yoav 2026-07-03 — "add friend" must actually work).
-- One row per directed request; mutual friendship = one row, status='accepted'.
-- Additive + idempotent: safe to run on prod at any time.

CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_status_check CHECK (status IN ('pending', 'accepted')),
  CONSTRAINT friendships_pair_uniq UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_addressee_pending
  ON friendships (addressee_id, status);

CREATE INDEX IF NOT EXISTS idx_friendships_requester
  ON friendships (requester_id, status);
