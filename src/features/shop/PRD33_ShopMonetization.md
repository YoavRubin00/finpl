ש# PRD 33: Shop UX Redesign & IAP Monetization (Phase 7)

## Overview
Currently, the shop allows users to spend coins earned in-game. To ensure the financial viability of FinPlay, the Shop must be redesigned to heavily promote **In-App Purchases (IAP)** using real cash (like Clash Royale or Candy Crush). The entire UX must funnel the user towards the Shop when they face friction (e.g., losing a life, waiting for a chest).

## Goal
Redesign `ShopScreen.tsx` to include premium currency bundles (Gems/Coins) purchasable with Real Money (Fiat), and aggressively enhance the UX to drive conversions.

---

## US-001: The Premium "Gem" Storefront

### Step A — Add GemBundle type to types.ts
- [x] Add `GemBundle` interface to `src/features/shop/types.ts` with fields: `id`, `name`, `gems`, `priceILS`, `priceLabel`, `emoji`, `isBestValue?`, `bonusLabel?`
- [x] Typecheck passes

### Step B — Create gemBundles.ts data
- [x] Create `src/features/shop/gemBundles.ts` with `GEM_BUNDLES: GemBundle[]` (Handful ₪9.90/50g, Chest ₪29.90/200g Best Value, Mountain ₪79.90/600g)
- [x] Typecheck passes

### Step C — Create IAPModal.tsx
- [x] Create `src/features/shop/IAPModal.tsx` — Modal with SpringIn, shows bundle details, "רכישה" button calls `addGems` + `successHaptic`, closes on dismiss
- [x] Typecheck passes

### Step D — Add Gem carousel to ShopScreen.tsx
- [x] Refactor `ShopScreen.tsx` to show Premium Gem carousel section ABOVE coin-category tabs
- [x] Carousel shows 3 GemBundle cards; tapping opens IAPModal
- [x] "Best Value" ribbon on Chest bundle
- [x] Current gems balance shown in header area
- [x] Typecheck passes

---

## US-002: Hard Friction Routing (Monetization Loop)

### Step E — Update OutOfHeartsModal
- [x] Find or create `OutOfHeartsModal` in `src/features/retention-loops/`
- [x] Add "מלא מיד — 50 ג'מס 💎" button; if gems < 50 → navigate to Shop (`router.push('/shop')`)
- [x] If gems ≥ 50 → call `spendGems(50)` + `restoreAllHearts()`
- [x] Typecheck passes

### Step F — Chest gem unlock routing
- [x] In ChestsRow or chest-opening flow: if chest is locked, show "פתח עכשיו — 100 ג'מס"
- [x] If gems < 100 → navigate to Shop; else spend 100 gems and open chest
- [x] Typecheck passes

---

## US-003: "Million Dollar" Polish

### Step G — Haptics + Lottie gem shower
- [x] On successful IAPModal purchase: trigger `successHaptic()` + `notificationAsync(NotificationFeedbackType.Success)`
- [x] Show Lottie gem shower animation (from `finnMascotConfig` pattern or placeholder source) for 2s after purchase
- [x] Typecheck passes

---

## Non-Goals
- Real credit-card processing (RevenueCat / PayPlus) — future phase
- Server-side purchase verification — future phase
- 3D Holographic card effects — future phase (PRD 29b dependency)

## Technical Notes
- `addGems` and `spendGems` already exist in `useEconomyStore`
- Mock purchase: `addGems(bundle.gems)` + dismiss modal
- All UI: StyleSheet.create, CLASH theme, Hebrew RTL
