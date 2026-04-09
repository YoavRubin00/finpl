# PRD 37: Passive Income & Asset Portfolio System

## Overview
Teach users what "income-generating assets" means through live app mechanics.
Your referred friends are your "human capital assets" — they earn coins/XP while learning,
and you receive a 5% weekly dividend. This mirrors dividend investing, REITs, and passive income.
A new "הנכסים שלי" page in Profile shows all holdings and teaches portfolio thinking.

## Goal
1. **Mechanics** — Extend `collectDividend()` to award 5% of friends' weekly COIN earnings (in addition to existing XP)
2. **Education** — Reframe referral UI with passive-income language; every friend = an asset
3. **Visibility** — "הנכסים שלי" page in Profile showing financial assets, network assets, and portfolio

## Data Model

`ReferredFriend` gains `weeklyCoins: number` (mock: 100–500 per friend per week).
`ReferralState` gains `totalDividendCoins: number` to track lifetime coin dividends.
`collectDividend()` now awards both XP and Coins, both at 5% of friends' weekly totals.

## User Stories

### US-001: Extend Dividend to Include Coins
**Acceptance Criteria:**
- [x] Add `weeklyCoins: number` to `ReferredFriend` in `src/features/social/referralTypes.ts`
- [x] Add `totalDividendCoins: number` to `ReferralState` interface (default 0)
- [x] Update `generateMockFriends()` in `referralData.ts` to include `weeklyCoins: random(100,500)`
- [x] Update `refreshWeeklyXP()` in `useReferralStore.ts` to also refresh `weeklyCoins`
- [x] Update `collectDividend()` to also call `addCoins(Math.floor(totalWeeklyCoins * DIVIDEND_PERCENT))`
- [x] Update `partialize` in persist config to include `totalDividendCoins`

### US-002: Educational Copy in Bridge/Referral UI
**Acceptance Criteria:**
- [x] In `src/features/the-bridge/BridgeScreen.tsx`, find the referral section
- [x] Add tagline below the invite CTA: `"כל חבר = נכס פיננסי שמניב לך 5% מהרווחים שלו"`
- [x] Show dividend rate badge on the dividend collection button: `"5% דיבידנד שבועי 💰"`
- [x] After collecting: success message says `"קיבלת דיבידנד מהנכסים שלך! 🎯"`
- [x] Add educational tooltip card (collapsible): explains real-world parallel to dividend investing

### US-003: "הנכסים שלי" Assets Screen
**Acceptance Criteria:**
- [x] Create `src/features/assets/AssetsScreen.tsx` with 4 sections:
  - **נכסים פיננסיים**: Coins + Gems + XP level cards with Lottie icons
  - **נכסי רשת**: Each referred friend card (name, weekly activity, your 5% yield this week)
  - **תיק השקעות**: Placeholder (links to Trading Hub — real data in PRD 30)
  - **סיכום**: Total lifetime dividend earned (XP + Coins), total friends count
- [x] Create `app/assets.tsx` as Expo Router entry
- [x] Add `'assets'` to `inContentRoute` whitelist in `app/_layout.tsx`
- [x] Add "📊 הנכסים שלי" button at the bottom of `ProfileScreen.tsx` action cards section
- [x] Educational label on each section explaining real-world parallel

### US-004: Animated Dividend Pill in ProfileScreen
**Acceptance Criteria:**
- [x] Add small pill below avatar/name row: `"💼 נכסים: X מטבעות + Y XP"`
- [x] Values pull from `totalDividendCoins` + `totalDividendXP` in `useReferralStore`
- [x] Pill has spring count-up animation when dividends are available to collect
- [x] Tapping pill navigates to `/assets`

## Execution Rules
- All new files in `src/features/assets/`
- Store changes only in `src/features/social/` files (types + store + data)
- No new backend — all Zustand + AsyncStorage
- AssetsScreen uses CLASH theme + DiamondBackground like ProfileScreen

## Architecture Notes
- `referralTypes.ts`: `ReferredFriend` + `ReferralState` interfaces
- `referralData.ts`: `generateMockFriends()`, `DIVIDEND_PERCENT`, `refreshWeeklyXP()`
- `useReferralStore.ts`: `collectDividend()`, `refreshWeeklyXP()` actions
- `useEconomyStore.ts`: `addCoins()`, `addXP()` — already available
- `app/_layout.tsx`: `inContentRoute` whitelist — add `'assets'`

## Pre-existing TS errors (safe to ignore):
- FeedSidebar.tsx — CLASH.primary does not exist
- useClashStore.ts — 'clash_win'/'clash_draw' not assignable to XPSource
- GlassOverlay.tsx — expo-blur not found
