# PRD 43: שיפור מוניטיזציה — PRO Sim Gates + Daily Deals

## Overview
Two monetization improvements: (1) Lock 6 simulations behind PRO to create conversion touchpoints during learning flow. (2) Add Clash Royale-style Daily Deals section in the Shop with rotating discounted items.

## Goal
Increase PRO conversion rate and shop engagement by adding friction at high-value moments (sim completion) and daily rotating deals that drive urgency.

---

## US-001: PRO-Locked Simulations — Constants + Gate Logic

### Step A — Define locked sim set
- [x] Create `src/constants/proGates.ts` with:
  ```ts
  export const PRO_LOCKED_SIMS = new Set([
    'mod-3-16',  // PanicIndexScreen (מדד הפאניקה)
    'mod-3-18',  // RoboAdvisorScreen (שגר ושכח)
    'mod-4-21',  // ETFBuilderScreen (בנה את הסל)
    'mod-4-22',  // TradingSimScreen (סימולטור מסחר)
    'mod-4-24',  // PortfolioManagerScreen (מנהל התיקים)
    'mod-5-25',  // FIRECalcScreen (מחשבון החופש)
  ]);
  ```
- [x] Typecheck passes

### Step B — Gate sim phase entry
- [x] In `src/features/chapter-1-content/LessonFlowScreen.tsx`, import `PRO_LOCKED_SIMS` from `src/constants/proGates.ts`
- [x] In `advanceQuiz` callback (~line 1230), replace the current blanket PRO gate with a selective one:
  ```ts
  } else if (MODULES_WITH_SIM.has(mod.id)) {
    if (PRO_LOCKED_SIMS.has(mod.id) && !useSubscriptionStore.getState().canUse("simulator")) {
      useUpgradeModalStore.getState().show("simulator");
      return;
    }
    setPhase("sim");
    mediumHaptic();
  }
  ```
- [x] Remove the old blanket PRO check (which gates ALL sims) — only PRO_LOCKED_SIMS should be gated
- [x] Typecheck passes

---

## US-002: PRO Lock Overlay on Sim Cards (DuoLearnScreen)

### Step C — Show lock icon on PRO-locked sim nodes
- [x] In `src/features/pyramid/DuoLearnScreen.tsx`, import `PRO_LOCKED_SIMS` from `src/constants/proGates.ts`
- [x] On module nodes that are in `PRO_LOCKED_SIMS`, overlay a small lock badge + "PRO" label
- [x] Badge style: absolute positioned, top-right of node circle, gold background (`#facc15`), `Lock` icon from lucide (size 10)
- [x] Tapping a PRO-locked node still enters the module (flashcards + quiz are free), but sim is gated at the end
- [x] Typecheck passes

---

## US-003: Daily Deals Data + Store

### Step D — DailyDeal type
- [x] Add to `src/features/shop/types.ts`:
  ```ts
  export interface DailyDeal {
    id: string;
    item: ShopItem;
    originalCost: number;
    discountedCost: number;
    discountPercent: number;
    currency: 'coins' | 'gems';
  }
  ```
- [x] Typecheck passes

### Step E — Daily deals generation logic
- [x] Create `src/features/shop/dailyDeals.ts`:
  - `generateDailyDeals(date: string): DailyDeal[]` — takes ISO date string
  - Uses seeded random (simple hash of date string) to pick 4 items from `SHOP_ITEMS`
  - Each deal gets 20-50% discount (seeded random per item)
  - At least 1 item from each of: hearts/hints, protection, cosmetics/avatars
  - Returns array of 4 DailyDeal objects
  - Deals change at midnight (new date = new seed = new items)
- [x] Typecheck passes

---

## US-004: DailyDealsSection Component

### Step F — Build the UI component
- [x] Create `src/features/shop/DailyDealsSection.tsx`:
  - Header row: "🔥 דילים יומיים" title (right-aligned RTL) + countdown timer "מתחדש בעוד HH:MM:SS"
  - Countdown uses `useEffect` + `setInterval` to count down to midnight
  - 4 deal cards in a 2×2 grid (2 columns, `flexWrap: 'wrap'`)
  - Each card shows:
    - Item emoji (large, centered top)
    - Item name (Hebrew, bold)
    - Original price crossed out (`textDecorationLine: 'line-through'`, gray)
    - Discounted price in green with coin/gem icon
    - Discount badge: "-30%" in red/orange pill (top-right corner)
    - "קנה!" button (green, Supercell-style)
  - Card style: `backgroundColor: '#18181b'`, `borderRadius: 16`, `borderWidth: 1`, `borderColor: '#27272a'`
  - Tapping "קנה!" opens existing `ConfirmModal` with discounted price
  - After purchase: card shows "נרכש ✓" (gray, disabled)
  - Track purchased deal IDs in component state (reset daily with new deals)
- [x] Typecheck passes

### Step G — Integrate into ShopScreen
- [x] Import `DailyDealsSection` in `src/features/shop/ShopScreen.tsx`
- [x] Place it ABOVE the gem bundles section (first content after hero header)
- [x] Wrapped in `Animated.View` with `FadeInDown.delay(100)` entrance
- [x] Typecheck passes

---

## US-005: Purchase Flow Integration

### Step H — Connect deals to economy store
- [x] In `DailyDealsSection`, on "קנה!" tap:
  - If `currency === 'coins'`: call `useEconomyStore.getState().spendCoins(discountedCost)`
  - If `currency === 'gems'`: call `useEconomyStore.getState().spendGems(discountedCost)`
  - If insufficient funds: show alert "אין מספיק מטבעות/ג'מים" with option to navigate to gem/coin bundles
  - On success: `successHaptic()`, mark deal as purchased, item effect applied
- [x] Typecheck passes

---

## Architecture Notes
- `PRO_LOCKED_SIMS` in `src/constants/proGates.ts` — shared between LessonFlowScreen and DuoLearnScreen
- Daily deals seeded random: `function seededRandom(seed: number)` using simple LCG algorithm
- Deals persist for the calendar day — date-based seed is deterministic, no server needed
- Shop uses dark theme (`#09090b` bg) — deal cards use `#18181b` background, `#27272a` borders
- All text RTL: `writingDirection: 'rtl'`, `textAlign: 'right'`
- Countdown timer: calculate `midnight - now` using `Date` object

## Pre-existing TS errors (safe to ignore)
- FeedSidebar.tsx — CLASH.primary does not exist
- useClashStore.ts — 'clash_win'/'clash_draw' not assignable to XPSource
- GlassOverlay.tsx — expo-blur not found
