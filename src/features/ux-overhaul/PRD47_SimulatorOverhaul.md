# PRD 47: Simulator Visual Overhaul (29 Sims)

## Introduction

All 29 simulation screens have broken/inconsistent visuals. Each sim hardcodes local color constants that conflict with the centralized `OCEAN_CHAPTER_PALETTE`. This PRD standardizes every sim to: ocean-blue base + chapter accent colors, single-page layout (no scrolling), small Lottie icons (no images), 3D glow cards, harmonious FadeInDown stagger animations, and full RTL Hebrew support.

## Goals

- Unify all 29 sims to use `OCEAN_CHAPTER_PALETTE` from `src/constants/theme.ts`
- Remove all `<Image>` tags — replace with small Lottie icons (28-48px)
- Single-page layout: remove `ScrollView` where possible, fit content in viewport
- Use `GlowCard` with chapter-specific glow colors for main interaction areas
- `FadeInDown` stagger pattern (100ms delay) for entrance animations
- `SimFeedbackBar` with chapter accent colors
- Small ambient Lottie decorations (2 per sim, via `SimLottieBackground`)

## Non-Goals

- Changing game logic, hooks, or data files
- Adding new simulations
- Changing reward amounts (XP/Coins)
- Modifying LessonFlowScreen integration

---

## User Stories

### US-001: Shared Infrastructure

**Description:** As a developer, I want chapter-aware shared components so that all sims can use them consistently.

**Acceptance Criteria:**
- [x] Add `getChapterTheme(chapterId: string)` helper to `src/constants/theme.ts` that returns the correct `OCEAN_CHAPTER_PALETTE` entry
- [x] Update `src/components/ui/SimLottieBackground.tsx`: add `chapterColors` prop, use chapter gradient instead of hardcoded green, make decoration size configurable (default 60px), increase opacity from 0.1 to 0.15
- [x] Update `src/components/ui/GlowCard.tsx`: add optional `chapterGlow` prop that overrides default purple with chapter glow color
- [x] Update `src/components/ui/SimFeedbackBar.tsx`: add optional `accentColor` prop for correct-answer bar, add optional `lottieSource` prop for small Lottie instead of emoji
- [x] Typecheck passes (`npx tsc --noEmit`)

---

### US-002: Chapter 1 Sims — BudgetGame, MinusTrap, Snowball

**Description:** Overhaul 3 Chapter 1 sims to new visual standard.

**Acceptance Criteria:**
- [x] `BudgetGameScreen.tsx`: Remove local CH1 color object → use `getChapterTheme('chapter-1')`. Remove all `<Image>` tags → use LottieIcon. Remove ScrollView → flex:1 single-page. Add FadeInDown stagger. Use GlowCard with chapter glow. Lottie decorations: `wired-flat-146-trolley-hover-jump.json` + `wired-flat-291-coin-dollar-hover-pinch.json`
- [x] `MinusTrapGameScreen.tsx`: Same transformation. Lottie: `wired-flat-2804-fire-flame-hover-pinch.json` + `wired-flat-25-error-cross-hover-pinch.json`
- [x] `SnowballGameScreen.tsx`: Same transformation. Lottie: `wired-flat-298-coins-hover-jump.json` + `wired-flat-161-growth-hover-pinch.json`
- [x] Typecheck passes

---

### US-003: Chapter 1 Sims — Compound, PayslipNinja, CarLoanRace

**Description:** Overhaul 3 more Chapter 1 sims.

**Acceptance Criteria:**
- [x] `CompoundSimScreen.tsx`: Remove local colors → getChapterTheme. Remove images → LottieIcon. Single-page layout. GlowCard. FadeInDown. Lottie: `wired-flat-945-dividends-hover-pinch.json` + `wired-flat-163-graph-line-chart-hover-slide.json`
- [x] `PayslipNinjaScreen.tsx`: Same transformation. Lottie: `wired-flat-56-document-hover-swipe.json` + `wired-flat-24-approved-checked-hover-pinch.json`
- [x] `CarLoanRaceScreen.tsx`: Same transformation. Lottie: `wired-flat-504-school-bus-hover-pinch.json` + `wired-flat-162-decrease-hover-pinch.json`
- [x] Typecheck passes

---

### US-004: Chapter 1 Sims — BankCombat, ShoppingCart, EmergencyFund

**Description:** Overhaul final 3 Chapter 1 sims.

**Acceptance Criteria:**
- [x] `BankCombatScreen.tsx`: Remove local colors → getChapterTheme. Remove images → LottieIcon. Single-page. GlowCard. FadeInDown. Lottie: `wired-flat-483-building-hover-blinking.json` + `wired-flat-457-shield-security-hover-pinch.json`
- [x] `ShoppingCartScreen.tsx`: Same transformation. Lottie: `wired-flat-146-trolley-hover-jump.json` + `wired-flat-100-price-tag-sale-hover-flutter.json`
- [x] `EmergencyFundScreen.tsx`: Same transformation. Lottie: `wired-flat-413-money-bag-hover-shake.json` + `wired-flat-457-shield-security-hover-pinch.json`
- [x] Typecheck passes

---

### US-005: Chapter 2 Sims — CreditScore, TaxPuzzle, RetirementRace

**Description:** Overhaul 3 Chapter 2 sims using `getChapterTheme('chapter-2')` (sky-blue).

**Acceptance Criteria:**
- [x] `CreditScoreScreen.tsx`: Remove local CH2 colors → getChapterTheme('chapter-2'). Remove images → LottieIcon. Single-page. GlowCard. FadeInDown. Lottie: `wired-flat-237-star-rating-hover-pinch.json` + `wired-flat-152-bar-chart-arrow-hover-growth.json`
- [x] `TaxPuzzleScreen.tsx`: Same transformation. Lottie: `wired-flat-56-document-hover-swipe.json` + `wired-flat-994-sticky-notes-hover-pinch.json`
- [x] `RetirementRaceScreen.tsx`: Same transformation. Lottie: `wired-flat-489-rocket-space-hover-flying.json` + `wired-flat-45-clock-time-hover-pinch.json`
- [x] Typecheck passes

---

### US-006: Chapter 2 Sims — TaxGrinder, InsuranceShield

**Description:** Overhaul remaining 2 Chapter 2 sims.

**Acceptance Criteria:**
- [x] `TaxGrinderScreen.tsx`: Remove local colors → getChapterTheme('chapter-2'). Remove images → LottieIcon. Single-page. GlowCard. FadeInDown. Lottie: `wired-flat-119-law-judge-hover-hit.json` + `wired-flat-291-coin-dollar-hover-pinch.json`
- [x] `InsuranceShieldScreen.tsx`: Same transformation. Lottie: `wired-flat-457-shield-security-hover-pinch.json` + `wired-flat-436-love-care-hover-pinch.json`
- [x] Typecheck passes

---

### US-007: Chapter 3 Sims — All 4

**Description:** Overhaul all 4 Chapter 3 sims using `getChapterTheme('chapter-3')` (blue).

**Acceptance Criteria:**
- [x] `InflationRaceScreen.tsx`: Remove local colors → getChapterTheme('chapter-3'). Remove images → LottieIcon. Single-page. GlowCard. FadeInDown. Lottie: `wired-flat-146-trolley-hover-jump.json` + `wired-flat-161-growth-hover-pinch.json`
- [x] `PanicIndexScreen.tsx`: Same transformation. Lottie: `wired-flat-411-news-newspaper-hover-pinch.json` + `wired-flat-426-brain-hover-pinch.json`
- [x] `InvestmentPathScreen.tsx`: Same transformation. Lottie: `wired-flat-782-compass-hover-pinch.json` + `wired-flat-458-goal-target-hover-hit.json`
- [x] `RoboAdvisorScreen.tsx`: Same transformation. Lottie: `wired-flat-746-technology-integrated-circuits-hover-pinch.json` + `wired-flat-1023-portfolio-hover-pinch.json`
- [x] Typecheck passes

---

### US-008: Chapter 4 Sims — RiskSlider, IndexLive, ETFBuilder

**Description:** Overhaul 3 Chapter 4 sims using `getChapterTheme('chapter-4')` (indigo).

**Acceptance Criteria:**
- [x] `RiskSliderScreen.tsx`: Remove local colors → getChapterTheme('chapter-4'). Remove images → LottieIcon. Single-page. GlowCard. FadeInDown. Lottie: `wired-flat-153-bar-chart-hover-pinch.json` + `wired-flat-402-legal-balance-legal-hover-pinch.json`
- [x] `IndexLiveScreen.tsx`: Same transformation. Lottie: `wired-flat-163-graph-line-chart-hover-slide.json` + `wired-flat-489-rocket-space-hover-flying.json`
- [x] `ETFBuilderScreen.tsx`: Same transformation. Lottie: `wired-flat-1023-portfolio-hover-pinch.json` + `wired-flat-166-bar-chart-diversified-double-hover-growth.json`
- [x] Typecheck passes

---

### US-009: Chapter 4 Sims — TradingSim, DividendTree, PortfolioManager

**Description:** Overhaul remaining 3 Chapter 4 sims.

**Acceptance Criteria:**
- [x] `TradingSimScreen.tsx`: Remove local colors → getChapterTheme('chapter-4'). Remove images → LottieIcon. Single-page. GlowCard. FadeInDown. Lottie: `wired-flat-947-investment-hover-pinch.json` + `wired-flat-955-demand-hover-click.json`
- [x] `DividendTreeScreen.tsx`: Same transformation. Lottie: `wired-flat-443-tree-hover-pinch.json` + `wired-flat-945-dividends-hover-pinch.json`
- [x] `PortfolioManagerScreen.tsx`: Same transformation. Lottie: `wired-flat-1023-portfolio-hover-pinch.json` + `wired-flat-974-process-flow-game-plan-hover-pinch.json`
- [x] Typecheck passes

---

### US-010: Chapter 5 Sims — FIRECalc, RealEstate, REIT

**Description:** Overhaul 3 Chapter 5 sims using `getChapterTheme('chapter-5')` (purple).

**Acceptance Criteria:**
- [x] `FIRECalcScreen.tsx`: Remove local colors → getChapterTheme('chapter-5'). Remove images → LottieIcon. Single-page. GlowCard. FadeInDown. Lottie: `wired-flat-2804-fire-flame-hover-pinch.json` + `wired-flat-489-rocket-space-hover-flying.json`
- [x] `RealEstateScreen.tsx`: Same transformation. Lottie: `wired-flat-63-home-hover-3d-roll.json` + `wired-flat-3302-house-sold-hover-pinch.json`
- [x] `REITScreen.tsx`: Same transformation. Lottie: `wired-flat-3303-house-rent-hover-pinch.json` + `wired-flat-945-dividends-hover-pinch.json`
- [x] Typecheck passes

---

### US-011: Chapter 5 Sims — RetirementCalc, EstatePlanning

**Description:** Overhaul remaining 2 Chapter 5 sims.

**Acceptance Criteria:**
- [x] `RetirementCalcScreen.tsx`: Remove local colors → getChapterTheme('chapter-5'). Remove images → LottieIcon. Single-page. GlowCard. FadeInDown. Lottie: `wired-flat-45-clock-time-hover-pinch.json` + `wired-flat-413-money-bag-hover-shake.json`
- [x] `EstatePlanningScreen.tsx`: Same transformation. Lottie: `wired-flat-443-tree-hover-pinch.json` + `wired-flat-1019-document-signature-hand-hover-pinch.json`
- [x] Typecheck passes

---

## Technical Notes

### Per-Sim Transformation Checklist (apply to ALL 29):
1. Remove local CH color object → use `getChapterTheme(chapterId)`
2. Remove all `<Image>` tags → replace with `<LottieIcon>` (28-48px)
3. Wrap in `SimLottieBackground` with chapter gradient colors
4. Main interaction area → `GlowCard` with `chapterGlow={theme.glow}`
5. Remove `ScrollView` → `flex:1` single-page layout
6. Add `FadeInDown` stagger (100ms delay between sections)
7. `SimFeedbackBar` → pass `accentColor={theme.primary}`
8. 3D shadow on primary CTA button (`borderBottomWidth: 4, borderBottomColor: theme.dark`)
9. All text: shared `RTL_STYLE`, chapter-appropriate text colors
10. 2 small Lottie decorations per sim (28-36px, 0.15 opacity)

### Color Source of Truth:
```typescript
import { OCEAN_CHAPTER_PALETTE, getChapterTheme } from "../../constants/theme";
const theme = getChapterTheme("chapter-1"); // returns { primary, bg, dim, glow, dark, shadow, text, gradient }
```

### Shared Components:
- `SimLottieBackground` — `src/components/ui/SimLottieBackground.tsx`
- `GlowCard` — `src/components/ui/GlowCard.tsx`
- `SimFeedbackBar` — `src/components/ui/SimFeedbackBar.tsx`
- `LottieIcon` — `src/components/ui/LottieIcon.tsx`

### Animation Pattern:
```typescript
import { FadeInDown } from "react-native-reanimated";
// Section 1: entering={FadeInDown.delay(100).springify()}
// Section 2: entering={FadeInDown.delay(200).springify()}
// Section 3: entering={FadeInDown.delay(300).springify()}
```

### Pre-existing TS errors (safe to ignore):
- FeedSidebar.tsx — CLASH.primary does not exist
- useClashStore.ts — 'clash_win'/'clash_draw' not assignable to XPSource
- GlassOverlay.tsx — expo-blur not found
