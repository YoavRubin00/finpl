# REAL Social Infrastructure Plan — replace ALL fabricated social data with Neon-backed real data

**Mandate (founder):** *"Put only real data, never fabricated. Build the infrastructure for real."*
**Date:** 2026-07-02 · **Owner:** backend architect · **Status:** spec / not yet built.

This document is the concrete build spec to delete every fabricated / seeded / client-simulated social surface in FinPlay and replace it with either (a) a real Neon-backed feed keyed on real `user_profiles`, or (b) an **honest empty / first-mover state** where real data is genuinely sparse. It reuses the ONE surface that is already real — the daily `CrowdQuestionCard` (`/api/crowd-question/{vote,stats}` → `crowd_question_votes`) — as the reference pattern for everything else.

> **Non-negotiable:** When there is no real data, show an honest empty/first-mover state. NEVER a fabricated number, name, avatar, chat line, %, or leaderboard row.

---

## 0. Ground rules discovered from the repo (must hold for every task below)

1. **Two files per prod route (the twin rule).** Prod only deploys `api/**/*.ts` (vercel.json functions glob). Endpoint LOGIC should live in `app/api/<route>+api.ts` (Web `Request→Response`) and be re-exported by a 4-line adapter `api/<route>.ts` via `toVercelHandler`. **Every new endpoint below ships as BOTH files** — write the real handler in `app/api/**`, add the thin adapter in `api/**`. Do not write a native-only `api/**` handler unless it already needs JWT `withAuth` (then follow the sync/* native style, and DO NOT leave a divergent `app/api` twin).
2. **Two auth models.** Aggregate/unauthed READS need no auth (copy `crowd-question/stats`). Per-user WRITES use either JWT `withAuth` (`ctx.userId`, `ctx.authId`) OR the legacy `authId`(email) + `X-Sync-Token` pattern (copy `crowd-question/vote`). **New code should prefer JWT `withAuth`** (canonical `api.get/post` client auto-attaches the Bearer). Reuse the `crowd-question/vote` `validateSyncAuth` style ONLY where matching an existing sibling endpoint.
3. **The real cross-user key in practice is EMAIL (`auth_id`), not the uuid.** Live queries (`referral/me`) join on `referrals.referee_auth_id` / `coin_events.auth_id` even though `schema.ts` declares uuid FKs — **schema.ts has drift; trust the live DB columns.** All new social tables below therefore store BOTH `user_id uuid` (FK `user_profiles.id`) AND a denormalized `author_auth_id` / display fields, and JOIN back to `user_profiles` on `id` for live level/coins/streak. Confirm actual column names in Neon before shipping any join.
4. **The `validateSyncAuth` null-token hole.** `validate.ts` returns TRUE when `sync_token` is null (unauth pass). Acceptable for low-stakes writes (a vote), NOT acceptable where we display the author's identity/coins. For identity-bearing writes use JWT `withAuth`.
5. **Migrations are MANUAL & idempotent.** No CI migrate. Hand-written idempotent DDL in `src/db/migrations/000N_*.sql`, applied out-of-band against prod `DATABASE_URL`. All SQL below is written `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` so it is safe to re-run. It goes live only when **the founder pushes `master` → Vercel**.
6. **Never fabricate to fill a gap.** If a feature structurally requires a *second real user* and there isn't one yet, that is EXPECTED early — the honest first-mover empty state is the deliverable, not a mock.

---

## 1. CROWD-WISDOM votes (multi-choice) — extend the one real surface

### Problem
The daily `CrowdQuestionCard` is real, but only binary `a`/`b` votes reach Neon (`CrowdWisdomScreen.handleSubmitVote` gates `submitCrowdVote` on `choiceId==='a'||'b'`). Richer ids (`bull`,`bear`,`b3`…) never sync, so the full Crowd-Wisdom screen and the friends-hub `CrowdWisdomCard` fall back to hardcoded `seedVotes`/`seedTotalVoters`/`baselinePct`. This is the **cheapest real win** because the table, endpoint, and client poller already exist.

### 1a. Neon — reuse `crowd_question_votes`, widen the `choice` domain
The table already exists. Today `choice` is effectively `a|b`. Widen it to accept multi-choice ids; keep the daily `UNIQUE(user, vote_date_il)` for the daily card but **allow multi-question voting** for the screen by making uniqueness per-question.

```sql
-- 0007_social_real.sql (idempotent) — CROWD WISDOM section
-- 1. widen choice to a short slug (was a|b). No enum in DB today (it's a text/varchar); just widen length if constrained.
ALTER TABLE crowd_question_votes
  ALTER COLUMN choice TYPE varchar(24);

-- 2. add per-question uniqueness so the full screen's non-daily questions can each be voted once,
--    WITHOUT breaking the daily card's one-vote-per-day rule.
--    Keep the existing daily unique(user, vote_date_il) for the daily question only if it is still desired;
--    for the screen we key on (user_id, question_id).
CREATE UNIQUE INDEX IF NOT EXISTS crowd_question_votes_user_question_uq
  ON crowd_question_votes (user_id, question_id);

-- (leave existing unique(user, vote_date_il) in place; the daily card keeps writing choice a|b under today's date)
-- index to make the aggregate COUNT(*) GROUP BY choice fast at scale:
CREATE INDEX IF NOT EXISTS crowd_question_votes_q_date_idx
  ON crowd_question_votes (question_id, vote_date_il);
```

> If the live `UNIQUE(user, vote_date_il)` conflicts with multi-question-per-day voting on the screen, migrate the daily card to also key on `(user_id, question_id)` and drop the date-only unique. Verify current constraints first: `node scripts/sql.mjs "SELECT indexdef FROM pg_indexes WHERE tablename='crowd_question_votes'"`.

### 1b. API — extend the existing two endpoints (no new routes)
- **`POST /api/crowd-question/vote`** (native `api/crowd-question/vote.ts`, has dead twin `app/api/crowd-question/vote+api.ts`). Change: replace the `choice !== 'a' && choice !== 'b'` validation with a slug regex `^[a-z0-9-]{1,24}$`. Keep the `onConflictDoNothing` but target `(userId, questionId)`. **Because this is a NATIVE route with a dead twin, edit `api/crowd-question/vote.ts` (prod), and update the twin identically or delete the twin to remove divergence risk.**
- **`GET /api/crowd-question/stats`** (adapter → `app/api/crowd-question/stats+api.ts`). Change: return the FULL distribution, not just `countA/countB`:
  ```ts
  // return { ok, counts: { [choiceId]: number }, total }
  const counts = await db.execute(sql`
    SELECT choice, COUNT(*)::int AS count
    FROM crowd_question_votes
    WHERE question_id = ${questionId} AND vote_date_il = ${voteDateIL}
    GROUP BY choice`);
  const map: Record<string, number> = {};
  let total = 0;
  for (const r of counts.rows as Array<{choice:string;count:number}>) { map[r.choice]=r.count; total+=r.count; }
  return Response.json({ ok: true, counts: map, total });
  ```
  Keep `countA/countB` in the response too (back-compat for the daily card) until the daily card is migrated to `counts`.

### 1c. Client wiring — swap seed for live, DELETE the baselines
- `src/features/crowd-wisdom/CrowdWisdomScreen.tsx` L138-152: **remove the `choiceId==='a'||'b'` gate** — always call `submitCrowdVote` with the real `choiceId`.
- `src/features/crowd-wisdom/lib/computeVerdict.ts`: `computePostVoteSnapshot` (L15-42) and `computeSentimentSnapshot` (L55-93) must consume the live `counts` map (fetched via a `useLivePercents`-style poller reused from `src/features/crowd-question/computeLiveStats.ts`) **instead of** `choice.seedVotes`.
- **DELETE** `seedVotes` / `seedTotalVoters` from every question in `src/features/crowd-wisdom/data/seedQuestions.ts` (L10-209). Keep only the question text/choices metadata.
- `src/features/crowd-question/crowdQuestionsData.ts` L11-12: **DELETE** `baselinePct` / `baselineN` from every question.
- `src/features/friends-hub/components/CrowdWisdomCard.tsx` L336/L342/L152: stop passing `q.baselinePct`/`baselineN`; fetch live `counts` (same poller) or keep %s hidden.

### 1d. Honest empty-state
When `total === 0` for a question: show **"היו הראשונים להצביע"** with no percentages, no bars, no "X משקיעים כבר הצביעו". After the user votes and they are the only voter, show **100% next to their own pick with the literal count "1 מצביע/ה"** — that is real, not fabricated. Only render the Bull/Bear sentiment gauge once `total ≥ N_MIN` (recommend `N_MIN=20`, tunable); below that show "עוד לא מספיק הצבעות כדי להראות מגמה".

### 1e. Ships as
Endpoint change requires a **deploy**. But the seed DELETIONS + gate removal are pure client changes that can ship immediately (they degrade to the honest empty state until the widened endpoint is live — acceptable and honest).

---

## 2. FRIENDS — real graph on top of `referrals`, no fake members

### Problem
`FRIEND_PROFILES` (10 invented members with hardcoded `level`/`coinsWon`), `useFriendsStore` auto-approves friend requests via `setTimeout`, and rehydrate promotes pending→friends. 100% fiction. The ONLY real user↔user edge that exists is `referrals`.

### 2a. Neon — reuse `referrals` for the real graph; NO new friends table for v1
The real, already-server-backed social edge is referral redemption. For v1 the "friends" leaderboard = **the people you referred + the person who referred you**, read live from `user_profiles`. This needs **zero new tables**.

Optional v2 (mutual friend requests) — only build if product (Yam) approves; costs a real table:
```sql
-- 0007_social_real.sql — FRIENDS v2 (OPTIONAL, gated on product approval)
CREATE TABLE IF NOT EXISTS friend_edges (
  id            bigserial PRIMARY KEY,
  requester_id  uuid NOT NULL REFERENCES user_profiles(id),
  addressee_id  uuid NOT NULL REFERENCES user_profiles(id),
  status        varchar(16) NOT NULL DEFAULT 'pending', -- pending|accepted|declined|blocked
  created_at    timestamptz NOT NULL DEFAULT now(),
  responded_at  timestamptz,
  CONSTRAINT friend_edges_no_self CHECK (requester_id <> addressee_id),
  CONSTRAINT friend_edges_uq UNIQUE (requester_id, addressee_id)
);
CREATE INDEX IF NOT EXISTS friend_edges_addressee_idx ON friend_edges (addressee_id, status);
```

### 2b. API — new authed leaderboard read (v1)
- **NEW `GET /api/friends/leaderboard`** — logic in `app/api/friends/leaderboard+api.ts`, adapter `api/friends/leaderboard.ts`. Auth: JWT `withAuth` (`ctx.authId`). Reads: join `referrals` (both directions on `auth_id`) → `user_profiles` and return real `display_name` (fallback: masked email / `referral_code`), `coins`, `xp`, `level`, `current_streak`. Include the caller's own row. Order by `coins DESC`.
  ```sql
  -- referred-by-me + who-referred-me, then their live stats
  SELECT p.id, p.display_name, p.coins, p.xp, p.level, p.current_streak
  FROM user_profiles p
  WHERE p.auth_id IN (
    SELECT referee_auth_id  FROM referrals WHERE referrer_auth_id = $1
    UNION
    SELECT referrer_auth_id FROM referrals WHERE referee_auth_id  = $1
  )
  ORDER BY p.coins DESC;
  ```
- **v2 only:** `POST /api/friends/request` (insert `friend_edges` pending), `POST /api/friends/respond` (accept/decline — server is source of truth, NEVER a timer), `GET /api/friends/leaderboard` extended to include accepted edges. Each with a twin.

### 2c. Client wiring — DELETE the simulation
- **DELETE** `FRIEND_PROFILES` (`src/features/friends/friendsData.ts` L8-119) entirely.
- **DELETE** the `setTimeout` auto-approve (`useFriendsStore.ts` L7-16, L43-52) and the pending→friends promotion on rehydrate (L83-91). If v2 isn't built, delete `useFriendsStore` local graph outright.
- `src/features/friends-hub/components/FriendsLeaderboardCard.tsx` L143-145: replace `FRIEND_PROFILES.filter(...)` + `p.coinsWon` with a `useQuery(['friends-leaderboard'], () => api.get('/api/friends/leaderboard'))` hook (copy `useEconomy`). Render real `coins`.
- Add an **invite CTA** as the primary action (reuse existing `useReferralStore.generateCode` + `/api/referral/register-code`). Growing your leaderboard = inviting real friends. This is honest and on-strategy (referrals are the real growth loop). Per memory, conversion CTAs must be in-app popups/banners, not OS push.

### 2d. Honest empty-state
New user with zero referrals sees: **"עדיין אין לך חברים כאן — הזמן חבר/ה עם הקוד שלך ותתחילו להתחרות"** + the invite button + (optionally) the caller's own single row so the board isn't blank. **No fabricated members, ever.** This is the clearest case where "real" structurally needs a second real user — the invite flow is the bridge and the empty state is the honest default.

### 2e. Ships as
DELETING the fakes = **pure client change, ship now** (board collapses to self-row + invite CTA, which is honest). The real leaderboard read requires a **deploy**.

---

## 3. FANTASY leaderboard — real entrants + live returns, honest small-N

### Problem
`MOCK_NAMES` (15 fake opponents), `getMockLeaderboard`+`seededRandom` (fabricated returns/ranks), `simulateWeeklyReturn`, and `mockPrice`/`mockWeeklyChange` on every stock. `claimResults` pays real coins/XP/gems based on the player's rank among **fabricated** opponents — this is the most dangerous fake (real rewards from fake competition).

### 3a. Neon — new `fantasy_entries` table
```sql
-- 0007_social_real.sql — FANTASY section
CREATE TABLE IF NOT EXISTS fantasy_entries (
  id             bigserial PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES user_profiles(id),
  author_auth_id varchar(254) NOT NULL,            -- denormalized email key (matches live-DB convention)
  week_id        varchar(24) NOT NULL,             -- e.g. '2026-W27'
  tier           varchar(24) NOT NULL,             -- league tier slug
  picks          jsonb NOT NULL,                   -- [{symbol, weight, entryPrice}] captured at draft from LIVE quotes
  entry_return   double precision,                 -- server-computed at settlement (null until settled)
  final_rank     int,                              -- server-computed at settlement
  status         varchar(16) NOT NULL DEFAULT 'open', -- open|settled
  created_at     timestamptz NOT NULL DEFAULT now(),
  settled_at     timestamptz,
  CONSTRAINT fantasy_entries_uq UNIQUE (user_id, week_id, tier)
);
CREATE INDEX IF NOT EXISTS fantasy_entries_week_tier_idx ON fantasy_entries (week_id, tier, entry_return DESC);
```

### 3b. API
- **NEW `POST /api/fantasy/enter`** (twin) — JWT `withAuth`. Body: `{ weekId, tier, picks }`. **`entryPrice` for each pick MUST be captured server-side from live quotes** (`/api/trading/quote` or `/api/market/live`) at insert time — never trust a client `mockPrice`. Upsert on `(user_id, week_id, tier)`.
- **NEW `GET /api/fantasy/leaderboard?weekId=&tier=`** (twin) — UNauthed aggregate read (copy `crowd-question/stats` style). Returns real entrants joined to `user_profiles` for display name, with `entry_return` + rank. While the week is `open`, compute live provisional returns from `/api/market/weekly-returns` (already wired via `useLiveReturnsStore`) applied to stored `picks`.
- **NEW `POST /api/fantasy/settle` (cron)** — Vercel scheduled function (add to `vercel.json` crons, weekly). Reads all `open` entries for the closing week, applies **real** `/api/market/weekly-returns`, computes `entry_return` + `final_rank`, writes back, sets `status='settled'`. **Prize settlement (coins/XP/gems) happens here, server-side, against REAL standings** — via the existing `economy/grant-coins` path (`coin_events`). The client must NOT compute prizes from a local board.

### 3c. Client wiring — DELETE all sims
- **DELETE** `MOCK_NAMES` (L541-545), `getMockLeaderboard`+`seededRandom` (L547-574), `simulateWeeklyReturn` (L580-584 — or gate behind an explicit `__DEMO__` flag, default off), `mockPrice`/`mockWeeklyChange` static fields (L140-534) in `src/features/fantasy-league/fantasyData.ts`.
- `useFantasyStore.ts`: L108 (`leaderboard=getMockLeaderboard`) → fetch `/api/fantasy/leaderboard` via `useQuery`; L305-331 `getLeaderboardWithLocal` merge logic → DELETE (server returns the caller's own row already); L239 `simulateFinalPrices` → use live returns; L250-268 `claimResults` → **DELETE local prize math**, prizes now arrive from the server settle cron.
- Draft entry prices come from live quotes at draft time.
- `sharkAnalysis` hardcoded fundamentals (L148-531): out of scope for "real data infra" but flag — date-stamp them and route to Waren for periodic verification (do not present stale P/E as current fact).

### 3d. Honest empty-state
If `< N_MIN` real entrants for a `(tier, weekId)` (recommend `N_MIN=5`): show **"עדיין אין מספיק שחקנים בליגה הזו השבוע — היכנסו וקבעו את הטון"** and either (a) put the user in a shared cross-tier matchmaking pool, or (b) run the week as a **solo challenge vs the market benchmark** (real S&P/index return from `/api/market/weekly-returns`) rather than vs fake opponents. Never show `MOCK_NAMES`. Weekly missions measured against "top 10" (`getWeeklyMissions`) must be gated/hidden until the board actually has ≥10 real entrants.

### 3e. Ships as
DELETING mocks + switching prices to live quotes = client change, but the leaderboard becomes empty until entries exist, so this is coupled to the **deploy** of `fantasy_entries` + endpoints. Prize integrity (settle cron) MUST precede any real-money-feeling rewards → **deploy required before this feature can pay out.** Until deployed, either hide Fantasy or run it in explicit solo-vs-market mode.

---

## 4. TRADE-ROOM messages — real room feed

### Problem
`SEED_LINES`/`buildSeedMessages` (scripted chats + fake likes/timestamps), `COMMUNITY` personas (10 fake regulars), messages local-only (never POST/fetch), `getSentimentSummary` bull% from seed, unread badges from seed count, `getDailyEventTopic` hardcoded, `memberBase` fabricated.

### 4a. Neon — new `room_messages` table
```sql
-- 0007_social_real.sql — TRADE ROOMS section
CREATE TABLE IF NOT EXISTS room_messages (
  id             bigserial PRIMARY KEY,
  room_id        varchar(48) NOT NULL,
  user_id        uuid NOT NULL REFERENCES user_profiles(id),
  author_auth_id varchar(254) NOT NULL,
  author_alias   varchar(48),                      -- anonymized display (e.g. 'החכם #<n>'), derived server-side, stable per user+room
  body           text NOT NULL,                    -- already moderated via existing anon-advice/moderate before insert
  ticker_tag     varchar(16),
  sentiment      varchar(8),                        -- bull|bear|null
  like_count     int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS room_messages_room_idx ON room_messages (room_id, created_at DESC);

-- per-user last-read for REAL unread counts
CREATE TABLE IF NOT EXISTS room_reads (
  user_id      uuid NOT NULL REFERENCES user_profiles(id),
  room_id      varchar(48) NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, room_id)
);
```

### 4b. API
- **NEW `GET /api/trade-rooms/messages?roomId=&sinceId=`** (twin) — UNauthed aggregate read (or JWT to also return unread). Returns real messages newest-first, paginated.
- **NEW `POST /api/trade-rooms/send`** (twin) — JWT `withAuth`. Body `{ roomId, body, tickerTag?, sentiment? }`. **MUST run the existing `/api/anon-advice/moderate` gate server-side before insert** (reuse it). Derives a stable `author_alias` from `user_id` (do not expose email). Updates `room_reads`.
- Optional `POST /api/trade-rooms/read` to bump `last_read_at`; unread = `COUNT(*) WHERE created_at > last_read_at`.
- `getSentimentSummary` bull% = server `COUNT(sentiment='bull')/COUNT(sentiment IS NOT NULL)` over real messages.

### 4c. Client wiring — DELETE seed chat
- **DELETE** `SEED_LINES`/`buildSeedMessages` (L153-231), `COMMUNITY` personas (L129-140), `memberBase` (L31-86) in `tradeRoomsData.ts`.
- `useTradeRoomsStore.ts`: DELETE `seedAllRooms` (L82) + rehydrate re-seed (L258-269); `sendMessage` (L119-167) → POST `/api/trade-rooms/send` then refetch; `messagesByRoom` populated from `GET /api/trade-rooms/messages` (poll with the 8s `computeLiveStats` pattern, or React-Query with short staleTime); `getSentimentSummary` (L107-117) + unread (L95-100) from server counts.
- `getDailyEventTopic`: either drive from a `bar_content` row (type `tip`/`cta`, the existing live-content system) or hide it. Do NOT show a hardcoded rotating topic as "היום מדברים על".
- Friends-hub `TradeRoomsCard.tsx` L30-37 `totalUnread` → real server unread.

### 4d. Honest empty-state
Empty room: **"עדיין שקט כאן — כתבו את ההודעה הראשונה"** + composer. Preview row shows "אין הודעות עדיין" not a fake last message. Unread badge only when real unread > 0. Member count: show real count or nothing — never `memberBase`. Sentiment gauge hidden until ≥ `N_MIN` tagged messages.

### 4e. Ships as
DELETING seed = client change ship-now (rooms go empty = honest). Real feed requires **deploy**. This is the feature most reliant on a critical mass of real users — early rooms will be quiet, and that quiet is the honest truth; the empty state + "be first" framing carries it.

---

## 5. PORTFOLIO-SHARE — real shared portfolios feed

### Problem
`SEED_PORTFOLIOS` (3 fake authors/returns/likes/comments), store is local-only MMKV, no server call. Already partly guarded (feed filtered to `isSelf`) but seeds still ship in the bundle + persisted store.

### 5a. Neon — new `shared_portfolios` (+ likes/comments)
```sql
-- 0007_social_real.sql — PORTFOLIO SHARE section
CREATE TABLE IF NOT EXISTS shared_portfolios (
  id             bigserial PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES user_profiles(id),
  author_auth_id varchar(254) NOT NULL,
  author_alias   varchar(48),
  picks          jsonb NOT NULL,                   -- [{symbol, weight}]; weeklyChange computed live at read, NOT stored
  caption        text,
  like_count     int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shared_portfolios_recent_idx ON shared_portfolios (created_at DESC);

CREATE TABLE IF NOT EXISTS shared_portfolio_likes (
  portfolio_id bigint NOT NULL REFERENCES shared_portfolios(id),
  user_id      uuid   NOT NULL REFERENCES user_profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (portfolio_id, user_id)              -- one like per user, real toggle
);

CREATE TABLE IF NOT EXISTS shared_portfolio_comments (
  id            bigserial PRIMARY KEY,
  portfolio_id  bigint NOT NULL REFERENCES shared_portfolios(id),
  user_id       uuid   NOT NULL REFERENCES user_profiles(id),
  author_alias  varchar(48),
  body          text NOT NULL,                     -- moderated before insert
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

### 5b. API
- **NEW `GET /api/portfolio-share/feed?cursor=`** (twin) — UNauthed read, newest-first. `weeklyChange` per pick computed live from `/api/market/weekly-returns` at read time (never stored/fabricated).
- **NEW `POST /api/portfolio-share/share`** (twin) — JWT. Insert row (caption moderated via existing moderate gate).
- **NEW `POST /api/portfolio-share/like`** (twin) — JWT. Insert/delete in `shared_portfolio_likes`; `like_count` = real `COUNT(*)` (or maintained via trigger).
- **NEW `POST /api/portfolio-share/comment`** (twin) — JWT, moderated.

### 5c. Client wiring — DELETE seeds
- **DELETE** `SEED_PORTFOLIOS` (`portfolioShareData.ts` L34-100).
- `usePortfolioShareStore.ts`: DELETE initial seed (L38) + rehydrate re-seed (L122-127); `sharePortfolio`/`toggleLike`/`addComment` (L47-113) → POST endpoints; `getFeed` (L41-45) → `GET /api/portfolio-share/feed`.
- `PortfolioShareCard.tsx` L451-458: **remove the `isSelf` filter workaround** — the server feed is already all-real, so show everyone's real shares.

### 5d. Honest empty-state
Empty feed: **"אף אחד עוד לא שיתף תיק — שתפו את שלכם ותהיו הראשונים"** + share CTA. Likes/comments show real counts (0 = "0", not hidden fake). `weeklyChange` shows real live number or "—" if quote missing.

### 5e. Ships as
DELETE seeds + drop `isSelf` workaround = client change, but feed goes empty until backed → couple with **deploy** of the table + `feed`/`share` endpoints.

---

## 6. ANON-ADVICE — real posts/replies feed (keep existing moderation)

### Problem
`SEED_POSTS` (3 fake dilemmas + fake poll splits), `SEED_REPLIES` (13 scripted replies with fabricated upvotes driving "most-helpful" sort), feed is 100% local. Server routes exist ONLY for `moderate`+`rephrase` — there is NO feed endpoint.

### 6a. Neon — new `advice_posts` / `advice_replies` (+ votes)
```sql
-- 0007_social_real.sql — ANON ADVICE section
CREATE TABLE IF NOT EXISTS advice_posts (
  id             bigserial PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES user_profiles(id),
  author_alias   varchar(48),                       -- anonymized, stable per user
  body           text NOT NULL,                      -- moderated + optionally rephrased before insert
  poll_options   jsonb,                              -- optional [{label}]; counts derived from advice_post_votes
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS advice_posts_recent_idx ON advice_posts (created_at DESC);

CREATE TABLE IF NOT EXISTS advice_post_votes (
  post_id      bigint NOT NULL REFERENCES advice_posts(id),
  user_id      uuid   NOT NULL REFERENCES user_profiles(id),
  option_index int    NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)                     -- one poll vote per user, real
);

CREATE TABLE IF NOT EXISTS advice_replies (
  id            bigserial PRIMARY KEY,
  post_id       bigint NOT NULL REFERENCES advice_posts(id),
  user_id       uuid   NOT NULL REFERENCES user_profiles(id),
  author_alias  varchar(48),
  body          text NOT NULL,                       -- moderated before insert
  upvote_count  int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS advice_reply_upvotes (
  reply_id   bigint NOT NULL REFERENCES advice_replies(id),
  user_id    uuid   NOT NULL REFERENCES user_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (reply_id, user_id)                    -- one upvote per user, real
);
```

### 6b. API
- **NEW `GET /api/anon-advice/feed?cursor=`** (twin) — UNauthed read; returns posts newest-first with real reply counts + real poll counts (aggregate).
- **NEW `GET /api/anon-advice/replies?postId=`** (twin) — real replies, sorted by real `upvote_count`.
- **NEW `POST /api/anon-advice/post`** (twin) — JWT. **Chain the EXISTING `/api/anon-advice/moderate` (+ optional `rephrase`) server-side before insert** — the moderation gate that already exists is preserved, we only add persistence.
- **NEW `POST /api/anon-advice/reply`** (twin) — JWT, moderated.
- **NEW `POST /api/anon-advice/vote`** (poll) + **`POST /api/anon-advice/upvote`** (reply) — JWT, real toggles.

### 6c. Client wiring — DELETE seeds
- **DELETE** `SEED_POSTS` (L107-159) + `SEED_REPLIES` (L161-285) in `anonAdviceData.ts`.
- `useAnonAdviceStore.ts`: DELETE seed init (L82-83) + rehydrate re-seed (L340-343); `submitPost`/`submitReply`/`votePostOption`/`togglePostLike` (L79-346) → POST endpoints; feed/replies from GET endpoints; "most-helpful" sort (L102-111) now over real `upvote_count`.

### 6d. Honest empty-state
Empty feed: **"עדיין אין דילמות — שתפו את הראשונה ותשמעו מה הקהילה חושבת"** + post CTA. Post with 0 replies: "אין תגובות עדיין — היו הראשונים לענות". Poll with 0 votes: no bars, "טרם הצביעו". Real counts only.

### 6e. Ships as
DELETE seeds = client change, feed empty until backed → couple with **deploy**.

---

## 7. Cross-cutting shared helpers to build once

1. **`author_alias` deriver** (`api/_shared/alias.ts`): stable anonymized handle from `user_id` (+ optional room/post salt) so the same user reads as the same "החכם #NNNN" without exposing email. Reused by trade-rooms, portfolio-share, anon-advice. **No 🦈 emoji anywhere** (per brand rule) — strip it from any alias/persona copy carried over.
2. **`withServerModeration(body)`** wrapper: calls existing `/api/anon-advice/moderate` logic inline before any user-authored insert (rooms, portfolio captions/comments, advice posts/replies).
3. **`N_MIN` thresholds** in one config: sentiment gauges & rank-based missions hidden below threshold; single source so product (Yam) can tune.
4. **Consistent unauthed aggregate-read pattern**: copy `crowd-question/stats` (rate-limited, sanitized params, `COUNT(*) GROUP BY`) for every `feed`/`leaderboard`/`stats` GET.
5. All Hebrew empty-state copy must pass `docs/BRAND.md` (Captain Shark voice, gender handling) before shipping.

---

## 8. Migration & deploy mechanism (exactly per the discovered process)

1. Write **one** idempotent migration file: `src/db/migrations/0007_social_real.sql`, containing all the `CREATE TABLE IF NOT EXISTS` / `ALTER … IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` blocks above. Idempotent = safe to re-run.
2. **Verify current constraints first** against the real DB before altering `crowd_question_votes`:
   `node scripts/sql.mjs "SELECT indexdef FROM pg_indexes WHERE tablename='crowd_question_votes'"` and confirm live referral/coin_events column names (`referrals.referee_auth_id` etc.) — schema.ts is drifted, trust the DB.
3. **Do NOT use `drizzle-kit push`** — it has proposed DROPping a live column due to schema drift. Apply the hand-written SQL against prod `DATABASE_URL` out-of-band (the same manual path used for `0006_add_bar_content`, which `migrate-local.mjs` even omits). Use a one-shot runner pointed at the prod URL (a prod-scoped variant of `scripts/sql.mjs`, or run each block via `@neondatabase/serverless`).
4. Update `src/db/schema.ts` to declare the new tables (keeps ORM + `db:studio`/`db:diagram` honest) — but schema.ts is documentation-of-record here, NOT the apply mechanism.
5. **Endpoints go live only when the founder pushes `master` → Vercel.** Per the dev-first rule: land all code on `dev`, PR to `master`, and the founder triggers the Vercel deploy. No `eas build`/`eas update` without explicit permission (these are server routes, so OTA/native build is NOT required — a Vercel push is enough for the endpoints; the client changes that DELETE seeds DO ride an OTA/`eas update`, which the founder triggers).
6. Add the fantasy settle cron to `vercel.json` crons only when Fantasy backend ships.
7. Every product-facing change (features/UX/copy/flows) routes through **Yam** for approval per current process; this spec is the engineering plan, not the product sign-off.

---

## 9. Dependency-ordered implementation sequence

**Phase 0 — ship-now, pure client, no backend (honest degradation immediately):**
- Delete `baselinePct`/`baselineN` and stop rendering them (crowd-question + friends-hub CrowdWisdomCard). (§1c, §1d)
- Delete `FRIEND_PROFILES` + the `setTimeout` auto-approve + rehydrate promotion; collapse friends board to self-row + invite CTA. (§2c/2d)
- Gate `simulateWeeklyReturn` behind an off-by-default demo flag; switch fantasy draft prices to live quotes; stop paying prizes from the local board (freeze Fantasy payouts or run solo-vs-market until §3 backend lands). (§3)
- These remove the most-dangerous fakes NOW and degrade to honest empty states.

**Phase 1 — the cheap real win (smallest backend surface):**
- §1 Crowd-Wisdom multi-choice: widen `crowd_question_votes.choice`, extend `vote`+`stats`, remove the a/b gate, delete `seedVotes`. Reuses an existing table + endpoints + poller. **Deploy #1.**

**Phase 2 — the real growth-aligned graph:**
- §2 Friends leaderboard over `referrals` (no new table for v1) + invite CTA. **Deploy #2.** (v2 `friend_edges` only if Yam approves.)

**Phase 3 — new-table feeds (share the §7 helpers; build in parallel after helpers exist):**
- §5 Portfolio-share, §6 Anon-advice, §4 Trade-rooms — each: table + `feed`/`send` twins + moderation chain + client swap + empty state. **Deploy #3.** (Order within phase by product priority; trade-rooms is most user-density-dependent, consider last.)

**Phase 4 — highest-integrity, do last:**
- §3 Fantasy real leaderboard + **server-side settle cron for prize integrity**. Must not pay real rewards until the settle path is live and tested. **Deploy #4.**

**Client-only vs deploy-first summary:**
| Feature | Can ship as pure client change NOW | Needs backend + deploy |
|---|---|---|
| Crowd-wisdom baselines | Delete baselines/gate (degrades honest) | Multi-choice counts live |
| Friends | Delete FRIEND_PROFILES + timers | Real leaderboard read |
| Fantasy | Kill sims + live draft prices + freeze fake-based payouts | Entries table + settle cron (prize integrity) |
| Trade-rooms | Delete seed chat (rooms go empty) | Real room feed + send |
| Portfolio-share | Delete seeds + drop isSelf hack | Real feed + share/like |
| Anon-advice | Delete seed posts/replies | Real feed + post/reply |

---

## 10. Where "real" genuinely needs a second real user (and how the honest state covers it)

Friends, trade-rooms, portfolio-share, and anon-advice **structurally require other real users** to look populated. Early on they will be quiet — that is the truth, not a defect. The honest empty/first-mover state ("היו הראשונים…", self-row + invite CTA, real 0/1 counts) is the correct product surface, and the referral invite loop (the only real growth edge in the DB) is the bridge that turns the empty state into a populated one. Fantasy is the special case: it can run as **solo-vs-market** (a real benchmark from `/api/market/weekly-returns`) so it is fully "real" even with one player. **The one thing we never do is manufacture a second user.**

---

## 11. Single biggest risk
**Fantasy prize integrity.** `claimResults` currently pays real coins/XP/gems from a rank computed against fabricated opponents. Deleting the mocks without moving prize settlement server-side (the §3b settle cron) either breaks payouts or, worse, leaves a client-trustable prize path. Fantasy MUST be either frozen/solo-vs-market or fully backed by the server settle cron before it pays anything — this is the highest-stakes and last-ordered item for a reason.
