# PRD: Duolingo-Style Leagues (DEFERRED — Large Effort)

**Status:** 🟡 Deferred — scope ~1-2 weeks, requires backend + DB migration + new UI  
**Source:** דואו audit 2026-04-16  
**Context:** Current [`arenaData.ts`](./arenaData.ts) has `MOCK_LEADERBOARD` — static fake users. This PRD replaces it with a real, dynamic, weekly-reset league system matching Duolingo's proven A/B-tested pattern (drives ~17% of their weekly DAU).

---

## Goal

Replace `MOCK_LEADERBOARD` with a real league system that:
- Ranks 30 real users per league by weekly XP earned
- Resets every Sunday (Israel timezone)
- Promotes top 3 / demotes bottom 5
- Uses loss-aversion psychology (end-of-week crunch, "X is ahead of you" nudges)

**NOT** Fantasy League (`src/features/fantasy-league/`) — that's a stock portfolio game. This is a generic learning-activity ranking.

---

## User Stories

### US-001: Data model — leagues, memberships, weekly XP
- **Schema** (Neon DB):
  - `leagues` table — tier (1-10), week_start, status (active/closed)
  - `league_memberships` — user_id, league_id, weekly_xp (denormalized), joined_at, final_rank (nullable until close)
  - `league_events` — for audit (promotion/demotion/reset)
- **Migration**: `mcp__Neon__prepare_database_migration` → add tables, indexes on `(league_id, weekly_xp DESC)`

### US-002: Tier system — 10 tiers
Bronze → Silver → Gold → Sapphire → Ruby → Emerald → Amethyst → Pearl → Obsidian → Diamond  
Add badge assets + i18n Hebrew names.

### US-003: Matchmaking — weekly bucket assignment
- Every Sunday 00:00 Asia/Jerusalem, create new league instances
- Bucket 30 users per league — **mixed skill levels within tier** (psychologically important — pure skill-based feels unbeatable)
- Cron via Vercel Cron or Neon scheduled function

### US-004: Weekly reset + promotion/demotion
- Sunday 23:59 close current week
- Top 3 → promote (celebration modal with Finn + confetti)
- Positions 4–25 → stay in tier
- Bottom 5 → demote (silent — **no "you lost" modal**, just next-week placement reveals new tier)
- Write result to `league_memberships.final_rank`

### US-005: Anti-cheat — Shadow Leagues
- Users with weekly XP > 10× tier median → flag
- Silently move to shadow league (bots with similar XP)
- **Never show the flag to the user**

### US-006: Legendary League (Diamond anti-burnout)
- Diamond users who hold Diamond 3 weeks → unlock access to "Legendary"
- Top-1% global competition, separate branding
- Prevents the "I made it, now what" burnout that loses Duo's top cohort

### US-007: In-lesson UI — league bar
- Replace [`MOCK_LEADERBOARD`](./arenaData.ts) consumption in all places
- Live position update (WebSocket or polling every session close)
- "X is 50 XP ahead of you" banner when applicable

### US-008: Notifications — end-of-week crunch
- Saturday 18:00: if in promotion zone → "2 שעות לקידום לכסף!"
- Saturday 22:00: if in demotion zone → "50 XP ויצאת מאזור הסכנה"
- Hook into existing `useFinnNotificationScheduler`

### US-009: Analytics + A/B scaffold
- Track: weekly active, promotion rate, demotion rate, end-of-week XP burst, notification CTR
- Feature flag `LEAGUES_V1_ENABLED` for 5% → 25% → 100% rollout
- Holdout group (5%) kept on MOCK_LEADERBOARD for baseline comparison

### US-010: Deprecate MOCK_LEADERBOARD
- Remove `MOCK_LEADERBOARD` from `arenaData.ts`
- Update all consumers (grep: `MOCK_LEADERBOARD`)
- Typecheck passes

---

## Benchmarks to target

From Duolingo public data:
- **+15% W2 retention** post-league launch
- **+17% weekly DAU** from end-of-week crunch sessions alone
- **+23% CTR** on "X ahead of you" notifications
- **40% of users** stay in Gold/Sapphire long-term (good sticky middle)

## Rollout
5% internal testing → 25% holdout A/B (4 weeks) → 100% if D7 retention delta ≥ +3pts.

## Dependencies
- Neon DB write access (already MCP-connected)
- Backend cron (Vercel Cron or self-hosted)
- New push notification categories in `expo-notifications`
- i18n Hebrew league names + Finn mascot celebration art
