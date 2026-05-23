-- Breaking News feature — daily AI-generated stock summaries.
-- Two tables:
--   `breaking_news_tracked`     per-user list of tickers the user follows
--   `breaking_news_summaries`   shared cache keyed by (ticker, trading_day)
--                               so we only call Tavily+Gemini once per ticker
--                               per day regardless of how many users track it.
--
-- The UNIQUE constraint on (ticker, trading_day) is the basis for cron
-- idempotency — a second cron run on the same day is a no-op.

CREATE TABLE IF NOT EXISTS "breaking_news_tracked" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid NOT NULL REFERENCES "user_profiles"("id") ON DELETE CASCADE,
  "ticker" text NOT NULL,
  "added_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "breaking_news_tracked_user_ticker_uniq" UNIQUE ("user_id", "ticker")
);

CREATE INDEX IF NOT EXISTS "idx_breaking_news_tracked_ticker"
  ON "breaking_news_tracked" ("ticker");

CREATE TABLE IF NOT EXISTS "breaking_news_summaries" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "ticker" text NOT NULL,
  "trading_day" date NOT NULL,
  "summary_text" text NOT NULL,
  "hype_index" smallint NOT NULL CHECK ("hype_index" BETWEEN 0 AND 100),
  "sentiment" text NOT NULL CHECK ("sentiment" IN ('bullish', 'bearish', 'neutral')),
  "key_events" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "sources" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "generated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "breaking_news_summaries_ticker_day_uniq" UNIQUE ("ticker", "trading_day")
);

CREATE INDEX IF NOT EXISTS "idx_breaking_news_summaries_ticker_day"
  ON "breaking_news_summaries" ("ticker", "trading_day" DESC);
