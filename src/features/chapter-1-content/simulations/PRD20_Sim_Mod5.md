# PRD 20 - Simulation: נינג'ה תלוש (Payslip Ninja) 🥷💳

## Introduction
Interactive simulation game for Chapter 1, Module 5 ("לקרוא תלוש שכר - ברוטו vs נטו").
The simulation is heavily inspired by "Fruit Ninja". The user starts with a massive "Gross Salary" (ברוטו) pizza or a glowing golden number. Suddenly, various deductions (Taxes, National Insurance, Health Tax) and savings (Pension, Study Fund) are launched across the screen like flying objects.
The user must "slice" or "swipe" these items into their correct bins (Red for Taxes/Deductions, Green for Savings/Pension) before they disappear to calculate their true "Net Salary" (נטו).

Teaches: The difference between Gross and Net, identifying which deductions are lost to the state (taxes) and which are actually kept for the user's future (pension).

## Goals
- Visceral, gamified understanding that "Gross is not what hits your bank account".
- Teach users not to fear the "Pension" deduction, as it is actually their money.
- Achieve a hyper-premium "Million Dollar App" aesthetic with 3D flying objects, glowing trails on swipe, and flawless 60FPS physics.
- High replayability and fun factor matching top-tier mobile games.

## User Stories

### US-001: Define types for Payslip Ninja Game
**Description:** As a developer, I want TypeScript interfaces to manage the flying objects, bins, and game physics securely.

**Acceptance Criteria:**
- [x] Create `ninjaTypes.ts` in `simulations/`
- [x] Define `NinjaItemType`: 'tax' | 'pension' | 'bonus' | 'health'.
- [x] Define `NinjaItem`: id, label, amount, type, initialVelocity (x, y).
- [x] Define `NinjaGameState`: currentGross, currentNet, activeItems, missedItems, strikes, isGameOver.
- [x] Typecheck passes.

### US-002: Create scenario data and physics configuration
**Description:** As a developer, I want predefined pay slips and realistic deduction ratios so the game reflects real Israeli salaries.

**Acceptance Criteria:**
- [x] Create `ninjaData.ts` in `simulations/`.
- [x] Export `ninjaConfig` with base salaries (e.g., ₪12,000, ₪20,000) and an array of items (e.g., -₪1,200 מס הכנסה, -₪700 פנסיה).
- [x] Define spawn rates and gravity constants for the flying engine.
- [x] Typecheck passes.

### US-003: Build 3D Physics & Gesture Engine (Reanimated & Gesture Handler)
**Description:** As a player, I want to use my finger like a sword to slice through flying deductions, leaving a glowing trail.

**Acceptance Criteria:**
- [x] Create `useNinjaEngine.ts` utilizing `react-native-reanimated` and `react-native-gesture-handler`.
- [x] Implement a game loop (using `useFrameCallback` or similar `withTiming`/`withDecay`) to propel items in an arc across the screen.
- [x] Implement a slicing gesture detector that tracks finger movement coordinates and checks for intersections with active items.
- [x] Add a glowing blade trail effect that follows the user's swipe.
- [x] Typecheck passes.

### US-004: Build the Game UI and "Million Dollar" Aesthetics
**Description:** As a player, I want to see an incredible UI with deep shadows, glowing slices, and vibrating impacts when I hit a target.

**Acceptance Criteria:**
- [x] Create `PayslipNinjaScreen.tsx` in `simulations/`.
- [x] Background: Deep space/dark gradient representing the "Gross Vault".
- [x] Top UI: A massive, glowing "₪12,000 הברוטו שלך" that aggressively ticks down as items are sliced, revealing the "Net".
- [x] Render flying items as 3D-styled pill shapes/cards with heavy drop shadows and glowing borders. Red items for Taxes, Green for Pension.
- [x] When an item is sliced: Trigger `heavyHaptic()`, play a particle explosion effect, and deduct the amount from the Gross.
- [x] Typecheck passes.
- [x] Verify changes work in browser (or confirm visual fidelity).

### US-005: Bins Logic and Educational Feedback
**Description:** As a player, after the frenzy ends, I need to understand what happened to my money.

**Acceptance Criteria:**
- [x] Slicing a "Tax" item sends it flying towards a Red "מדינה" (State) bin. Slicing a "Pension" item sends it to a Green "עתיד השקעות" (Future Savings) bin.
- [x] After all items are cleared, the game ends.
- [x] Show a summary screen: What is your actual Net Salary? How much went to the state? How much was saved for you?
- [x] Add a specific GlowCard explaining: "פנסיה היא לא מס! זה הכסף שלך!".
- [x] Reward: +40 XP and +30 Coins via `useEconomyStore`.
- [x] Typecheck passes.

### US-006: Integrate into chapter map
**Description:** As a player, I want to seamlessly launch this simulator after the relevant flashcards in Module 5.

**Acceptance Criteria:**
- [x] Update `LessonFlowScreen.tsx`: module `mod-1-5` triggers `PayslipNinjaScreen`.
- [x] Ensure smooth transition in and out.
- [x] Typecheck passes.

## Non-Goals
- Perfect real-world tax calculator (ranges and brackets are simplified for the game).
- Multiplayer leaderboards.
- Complex 3D engine like Unity/Three.js (use Skia/Reanimated to fake the 3D depth).

## Technical Notes
- `react-native-gesture-handler`'s `PanGesture` is essential for the sword slice mechanic.
- Use `react-native-skia` or `react-native-reanimated` for the actual blade particle trail to achieve 60FPS.
- Use `expo-haptics` aggressively to give the slicing a crunchy, satisfying feel.
