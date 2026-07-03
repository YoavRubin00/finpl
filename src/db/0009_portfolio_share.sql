-- 0009: server-backed community portfolio feed (Yoav 2026-07-03).
-- The old feed was device-local (each user saw only their own portfolios), so a
-- cross-user rating / average / like / comment was impossible without fabricating
-- data. These tables give a shared portfolio a stable, cross-user identity and
-- carry the REAL community reactions: 1-5 star ratings, likes, and comments.
-- Additive + idempotent — safe to run on prod at any time. Run manually against
-- prod DATABASE_URL (NOT drizzle-kit push — there is known schema drift).

-- Shared portfolios ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS shared_portfolios (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  author_auth_id    varchar(254) NOT NULL,         -- denormalized email key (live-DB convention)
  author_name       varchar(64),                   -- snapshot of the display name at share time
  author_avatar_id  varchar(48),                   -- snapshot of the game avatarId the client sent
  picks             jsonb NOT NULL,                -- [{ticker,sector,allocationPct,isLeverage}] — composition only
  caption           text,                          -- sanitized + moderated before insert
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shared_portfolios_picks_nonempty CHECK (jsonb_array_length(picks) >= 2)
);
CREATE INDEX IF NOT EXISTS shared_portfolios_recent_idx ON shared_portfolios (created_at DESC);
CREATE INDEX IF NOT EXISTS shared_portfolios_user_idx   ON shared_portfolios (user_id);

-- Star ratings (1 per rater per portfolio) ----------------------------------
CREATE TABLE IF NOT EXISTS portfolio_ratings (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id  uuid NOT NULL REFERENCES shared_portfolios(id) ON DELETE CASCADE,
  rater_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rater_auth_id varchar(254) NOT NULL,
  stars         smallint NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_ratings_stars_range     CHECK (stars BETWEEN 1 AND 5),
  CONSTRAINT portfolio_ratings_one_per_rater   UNIQUE (portfolio_id, rater_user_id)
);
CREATE INDEX IF NOT EXISTS portfolio_ratings_portfolio_idx ON portfolio_ratings (portfolio_id);

-- Likes (1 per user per portfolio) ------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_likes (
  portfolio_id  uuid NOT NULL REFERENCES shared_portfolios(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (portfolio_id, user_id)
);
CREATE INDEX IF NOT EXISTS portfolio_likes_portfolio_idx ON portfolio_likes (portfolio_id);

-- Comments ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_comments (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id      uuid NOT NULL REFERENCES shared_portfolios(id) ON DELETE CASCADE,
  author_user_id    uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  author_auth_id    varchar(254) NOT NULL,
  author_name       varchar(64),
  author_avatar_id  varchar(48),
  body              text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_comments_body_len CHECK (char_length(body) BETWEEN 1 AND 300)
);
CREATE INDEX IF NOT EXISTS portfolio_comments_portfolio_idx ON portfolio_comments (portfolio_id, created_at);
