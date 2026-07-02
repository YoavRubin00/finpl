-- Crowd-wisdom coin betting (parimutuel pool). One bet per user per question.
CREATE TABLE IF NOT EXISTS crowd_bets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  choice_id text NOT NULL,
  stake integer NOT NULL CHECK (stake >= 10 AND stake <= 1000),
  locked_odds double precision NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'refunded')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT crowd_bets_user_question_key UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_crowd_bets_question ON crowd_bets (question_id);
