-- 0011_trade_room_chat.sql — real server-backed trade-room chat (2026-07-04)
-- Before this, trade-room messages lived only in each device's local storage —
-- no user ever saw another user's message. This table makes the rooms real.
-- Idempotent: safe to run more than once.

CREATE TABLE IF NOT EXISTS trade_room_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id text NOT NULL,
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  avatar_id text,
  body text NOT NULL,
  sentiment text,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trade_room_messages_user_fk
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  CONSTRAINT trade_room_messages_body_len
    CHECK (char_length(body) BETWEEN 1 AND 240),
  CONSTRAINT trade_room_messages_sentiment_chk
    CHECK (sentiment IS NULL OR sentiment IN ('bull','bear'))
);

CREATE INDEX IF NOT EXISTS trade_room_messages_room_idx
  ON trade_room_messages (room_id, created_at);
