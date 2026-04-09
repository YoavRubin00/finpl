# PRD 42: Fantasy Stock Draft

## Overview
A weekly "Snake Draft" mini-game where users draft 5 stocks across 5 asset categories (Value, Growth, Tech, Macro, Crypto). Performance is tracked across the week. Integrates with the existing Fantasy League screen as a new tab.

## Goal
Drive daily retention: users check back mid-week to see how their draft picks are performing vs AI competitors.

## Data Model

### DraftCategory
```ts
interface DraftCategory {
  id: string;
  label: string;        // Hebrew category name
  color: string;        // accent color
  assetIds: string[];   // subset of TRADABLE_ASSETS ids to pick from
}
```

### DraftPick
```ts
interface DraftPick {
  round: number;        // 1-5
  categoryId: string;
  assetId: string;
  entryPrice: number;   // price at draft time
}
```

### DraftState (Zustand store)
```ts
interface DraftState {
  weekId: string;           // ISO week string (e.g. "2026-W11")
  picks: DraftPick[];       // max 5
  currentRound: number;     // 1-5
  isDraftComplete: boolean;
}
```

## User Stories

### US-001: Types + Category Data (draftTypes.ts + draftData.ts)
- [x] Create `draftTypes.ts` with DraftCategory, DraftPick, DraftState interfaces
- [x] Create `draftData.ts` with 5 DRAFT_CATEGORIES:
  - `value`: ערך — AAPL, MSFT, GOOGL
  - `growth`: צמיחה — NVDA, META, AMZN
  - `tech`: טכנולוגיה — TSLA, NVDA, MSFT
  - `macro`: מאקרו — XAU, XAG, SPY
  - `crypto`: קריפטו — BTC, ETH
- [x] Export `getCurrentWeekId()` helper (ISO week string)
- [x] Typecheck passes

### US-002: Draft Store (useDraftStore.ts)
- [x] Zustand + persist (AsyncStorage)
- [x] `initWeek()` — resets picks if weekId changed (new week = new draft)
- [x] `makePick(assetId, categoryId, entryPrice)` — adds pick, increments round
- [x] `resetDraft()` — clears all picks for re-draft
- [x] Derived getter: `getRemainingCategories()` — returns unselected category IDs
- [x] Typecheck passes

### US-003: DraftScreen UI (DraftScreen.tsx)
- [x] Shows current round (e.g. "סבב 3 מתוך 5")
- [x] Category card: colored header + category label + 3 asset options as pressable cards
- [x] Each asset card: emoji + name + last price (fetched from marketApiService)
- [x] Selecting an asset: scale bounce + gold border + confirm button
- [x] After confirm: FadeOut → next round card slides in
- [x] Draft complete state: summary of 5 picks with entry prices
- [x] Typecheck passes

### US-004: Integration into FantasyLeagueScreen
- [x] Add "ドラフト" / "דראפט" tab alongside leaderboard/portfolio tabs
- [x] Tab shows DraftScreen (or draft summary if complete)
- [x] Week countdown applies to draft tab too (re-drafts on new week)
- [x] Typecheck passes

## Architecture
- New files in `src/features/fantasy-league/`
- Reuses `fetchLatestPrice` from `marketApiService`
- Reuses `TRADABLE_ASSETS` + `ASSET_BY_ID` from `tradingHubData`
- Week detection: `getCurrentWeekId()` → "YYYY-WNN" string
- `useDraftStore` persisted separately from `useFantasyStore`
- No server needed — local-only for now
