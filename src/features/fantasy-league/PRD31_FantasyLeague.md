# PRD 31: Fantasy League

## Status
IN PROGRESS

## Directory
`src/features/fantasy-league/`

## Overview
A weekly/monthly stock-picking competition. Each player gets a fixed "Fantasy Cash" budget
to allocate to a mock portfolio. League results are tracked on a live leaderboard and winners
earn in-game XP/Coins/Gems. Reuses PRD 30's market data infrastructure (tradingHubData,
marketApiService) — no new API setup needed.

## Architecture
- **Data layer**: Zustand store (`useFantasyStore.ts`) + AsyncStorage persist
- **Market prices**: reuse `marketApiService.fetchLatestPrice()` from PRD 30
- **Assets**: reuse `TRADABLE_ASSETS` from `tradingHubData.ts`
- **Economy rewards**: `useEconomyStore.addCoins / addXP / addGems`
- **Entry point**: "עוד" tab → FantasyLeagueScreen

## User Stories

### US-001 — Types (`fantasyTypes.ts`)
- [x] `FantasyLeague`: id, name, startDate (ISO), endDate (ISO), budgetPerPlayer (number, Fantasy Cash), status ('active'|'upcoming'|'ended')
- [x] `FantasyPortfolio`: leagueId, playerId ('local'), startingBudget, cashRemaining, positions: FantasyPosition[]
- [x] `FantasyPosition`: id, assetId (ticker), assetName, quantity (shares), buyPrice, currentPrice, pnlPercent
- [x] `LeaderboardEntry`: rank, playerId, displayName, portfolioValue, pnlPercent, change ('+1'|'-1'|'new')
- [x] `FantasyState`: currentLeague, portfolio, leaderboard: LeaderboardEntry[], lastUpdated

### US-002 — Seeded League Data (`fantasyData.ts`)
- [x] Export `CURRENT_LEAGUE: FantasyLeague` — weekly league, startDate = current Monday, endDate = Sunday, budget = 10,000 Fantasy Cash (FC)
- [x] Export `MOCK_LEADERBOARD: LeaderboardEntry[]` — 10 seeded AI competitors with realistic Hebrew names, pnl range -5% to +12%
- [x] Local player always at rank position 4 initially (mid-pack, beatable)

### US-003 — Store (`useFantasyStore.ts`)
- [x] Zustand + AsyncStorage persist
- [x] `initPortfolio(league)` → set portfolio with startingBudget, empty positions
- [x] `buyAsset(assetId, quantity, price)` → deduct from cashRemaining, push FantasyPosition
- [x] `sellAsset(positionId, currentPrice)` → add proceeds to cashRemaining, remove position
- [x] `refreshPrices()` → call `fetchLatestPrice` for each held position → update currentPrice + pnlPercent
- [x] `computePortfolioValue()` → cashRemaining + sum(position.quantity * currentPrice)
- [x] `getLeaderboard()` → merge local player into MOCK_LEADERBOARD sorted by portfolioValue desc
- [x] Auto-refresh prices every 30s via `setInterval` in `useEffect`

### US-004 — League Screen (`FantasyLeagueScreen.tsx` + `app/fantasy.tsx`)
- [x] `app/fantasy.tsx` — Expo Router entry (already exists, just wire to FantasyLeagueScreen)
- [x] Header: league name + countdown timer to end (live, updates every second)
- [x] Leaderboard tab: animated rank list, local player row highlighted gold
- [x] My Portfolio tab: cash remaining + total value + pnl%, list of positions with mini sparklines (just color, no chart)
- [x] Buy Assets button → opens asset picker bottom sheet (reuse asset list from PRD 30)
- [x] "Sell" swipe on each position row
- [x] Animations: FadeInDown stagger on rows, gold glow on local player row, confetti burst on top-3 finish

### US-005 — Buy/Sell flow + Rewards
- [x] Buy sheet: asset name, current price (fetched live), quantity input (spin wheel or +/- buttons), "Cost: X FC" display
- [x] Validate: quantity * price <= cashRemaining (show red flash if over budget)
- [x] Confirm buy → `buyAsset()` + haptic feedback
- [x] Sell: show gain/loss in green/red → `sellAsset()` → trigger XP reward if profitable (sim_complete: +30 XP, +50 Coins)
- [x] League end detection: if `endDate < now` → show results overlay → distribute rewards:
  - Rank 1: +300 XP, +500 Coins, +5 Gems
  - Rank 2: +200 XP, +300 Coins, +3 Gems
  - Rank 3: +100 XP, +150 Coins, +1 Gem
  - All others: +50 XP, +100 Coins

## Technical Notes
- Fantasy Cash (FC) is separate from in-game Coins — purely in-league virtual currency
- `fetchLatestPrice` may fail (offline/weekend) — fallback to last known price silently
- Keep screen entry in `app/(tabs)/fantasy.tsx` which already exists
- Wire FantasyLeagueScreen from `src/features/more/MoreScreen.tsx` as well (for discoverability)
- No backend required — fully local for MVP (leaderboard is seeded AI opponents)

## Pre-existing TS Errors (safe to ignore in tsc)
- FeedSidebar.tsx — CLASH.primary does not exist
- useClashStore.ts — 'clash_win'/'clash_draw' not assignable to XPSource
- GlassOverlay.tsx — expo-blur not found
