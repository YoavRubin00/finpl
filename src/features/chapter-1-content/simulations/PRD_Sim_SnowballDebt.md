# PRD 18 - Simulation: כדור שלג דיגיטלי (Digital Snowball) ❄️

## Introduction
Interactive simulation game for Chapter 1, Module 3 ("אשראי ותשלום מינימום").
The player manages a credit card over 8 rounds (months). Each round they face a purchase decision and must choose how to pay: full payment, installments (no interest), or credit (with interest). After each purchase they choose whether to pay the full bill or minimum payment.
A visual "snowball" grows in real-time showing accumulated debt + interest. The snowball crushes their future salary bar.

Teaches: credit vs installments difference, minimum payment trap, compound interest on credit debt, psychological pain of virtual payments.

## Goals
- Visceral understanding of how minimum payments create a debt snowball
- Show the real cost difference between תשלומים רגילים (regular installments) vs קרדיט (credit)
- Demonstrate how paying minimum = paying interest on interest
- Reward players who pay in full or avoid credit
- Match Module 1-2 simulation quality (same component pattern)

## User Stories

### US-001: Define types for Snowball Debt game
**Description:** As a developer, I want TypeScript interfaces for the snowball debt simulation so that all game logic is type-safe.

**Acceptance Criteria:**
- [x] Create `snowballTypes.ts` in `simulations/`
- [x] Define `PaymentMethod` type: 'full' | 'installments' | 'credit'
- [x] Define `PurchaseScenario` interface with: id, item (string), emoji, price, description, options array
- [x] Define `PurchaseOption` interface with: id, label, method (PaymentMethod), monthlyAmount, totalCost, feedback
- [x] Define `BillChoice` type: 'full' | 'minimum'
- [x] Define `SnowballGameConfig` with: monthlySalary, minimumPaymentPercent (0.05), creditInterestRate (0.12/month), scenarios array
- [x] Define `SnowballGameState` with: month, salary, totalDebt, monthlyObligations, interestPaid, snowballSize (visual), choices history, isComplete
- [x] Define `SnowballScore` with: overallScore (0-100), grade (S/A/B/C/F), gradeLabel, totalInterestPaid, peakDebt, freeIncomePercent
- [x] Typecheck passes

### US-002: Create 8 purchase scenarios
**Description:** As a player, I want realistic Israeli purchase scenarios each month to learn about credit traps through experience.

**Acceptance Criteria:**
- [x] Create `snowballData.ts` in `simulations/`
- [x] Export `snowballConfig` with monthlySalary=₪8,000, minimumPaymentPercent=0.05, creditInterestRate=0.015 (1.5%/month = ~18%/year)
- [x] 8 scenarios: new laptop for work (₪4,000), weekend getaway (₪1,200), dentist treatment (₪2,500), new wardrobe (₪1,800), friend's birthday dinner (₪350), gym annual membership (₪2,400), Black Friday phone (₪3,200), car insurance renewal (₪3,600)
- [x] Each scenario has 2-3 payment options: pay full now, split to installments (no interest), or credit (with interest)
- [x] Each option shows: monthly cost, total real cost, Hebrew feedback
- [x] Typecheck passes

### US-003: Build game logic hook
**Description:** As a developer, I want a `useSnowballGame` hook that tracks debt accumulation, applies credit interest, and scores the player.

**Acceptance Criteria:**
- [x] Create `useSnowballGame.ts` in `simulations/`
- [x] Hook accepts `SnowballGameConfig` parameter
- [x] Track running debt: each credit purchase adds to debt pool
- [x] Each month: apply interest on remaining debt (debt * creditInterestRate)
- [x] After purchase choice: ask bill choice (full/minimum). Minimum = pay 5% of debt, rest accrues interest
- [x] Track: totalInterestPaid, peakDebt, snowballSize (debt/salary ratio as visual multiplier)
- [x] Score: penalize interestPaid (40pts), peakDebt (30pts), remaining debt (30pts). S≥90, A≥75, B≥55, C≥35, F<35
- [x] Export resetGame() function
- [x] Typecheck passes

### US-004: Build snowball visualization and balance UI
**Description:** As a player, I want to see a growing snowball that represents my debt, and a salary bar being crushed by monthly obligations.

**Acceptance Criteria:**
- [x] Create `SnowballGameScreen.tsx` in `simulations/`
- [x] `SnowballVisual` sub-component: circle that grows proportionally to debt (starts small, grows with each credit purchase)
- [x] Color: white/blue when small, orange when medium (debt > salary), red when large (debt > 2x salary)
- [x] `SalaryBar`: horizontal bar showing free income vs obligations. Obligations section grows red as debt increases
- [x] Display: month (חודש X/8), total debt, monthly interest amount
- [x] All text RTL Hebrew
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-005: Build purchase cards with payment options
**Description:** As a player, I want to see each purchase scenario and choose how to pay.

**Acceptance Criteria:**
- [x] Add purchase card to `SnowballGameScreen.tsx` with emoji, item name, price, description (RTL)
- [x] Payment option buttons showing: method label, monthly cost, total real cost
- [x] Color coding: green for full payment, yellow for installments, red for credit
- [x] After purchase: show bill choice modal — "לשלם חיוב מלא" vs "תשלום מינימום (5%)"
- [x] Show feedback text for 2s before advancing
- [x] Haptic feedback: success for full payment, warning for credit/minimum
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-006: Build score/results screen
**Description:** As a player, I want a score breakdown showing my grade, total interest paid, and debt snowball size.

**Acceptance Criteria:**
- [x] Score screen in `SnowballGameScreen.tsx` with grade letter and Hebrew label
- [x] Show stats: total interest paid, peak debt, remaining debt, free income percentage
- [x] Final snowball size visualization (small=good, huge=bad)
- [x] Grade messages: S="מלך המזומן!", A="כמעט חף מחובות", B="כדור השלג צובר תאוצה", C="הריבית שולטת", F="כדור השלג מחץ אותך"
- [x] Reward: +20 XP (sim_complete) and +15 Coins on first completion
- [x] Replay and Continue buttons
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-007: Integrate into lesson flow
**Description:** As a player completing Module 3 quizzes, I want the snowball game to launch automatically as the simulation phase.

**Acceptance Criteria:**
- [x] Update `LessonFlowScreen.tsx`: module `mod-1-3` triggers `SnowballGameScreen` in sim phase
- [x] Export `SnowballGameScreen` from `simulations/index.ts`
- [x] Game completion advances lesson flow (same pattern as BudgetGameScreen and MinusTrapGameScreen)
- [x] Typecheck passes
- [ ] Verify changes work in browser

## Non-Goals
- No real credit card API integration
- No persistent debt tracking between sessions
- No multiplayer/leaderboard
- No 3D snowball animation (simple circle scaling only)

## Technical Notes
- Follow exact pattern: snowballTypes.ts → snowballData.ts → useSnowballGame.ts → SnowballGameScreen.tsx
- Reuse: GlowCard, AnimatedPressable, ConfettiExplosion, useEconomyStore
- Hebrew RTL: { writingDirection: 'rtl', textAlign: 'right' }
- Bill choice (full/minimum) is a second step after purchase — creates a two-phase round
- Snowball visual: use Animated.Value for smooth size transitions
