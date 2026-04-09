# PRD 19 - Simulation: ריבית דריבית - הקסם השמיני (Compound Interest Magic) ✨

## Introduction
Interactive simulation game for Chapter 1, Module 4 ("ריבית דריבית").
The simulation aims to visually and interactively demonstrate the explosive power of compound interest over time (the "Eighth Wonder of the World").
The user plays with an initial investment and a monthly contribution, and uses a time slider to see how the total amount grows exponentially over the years compared to a linear non-invested savings approach.

Teaches: The exponential curve of compound interest, the vital importance of starting early, and the difference between simple savings and invested money.

## Goals
- Visually demonstrate the "hockey stick" curve of compound interest in a breathtaking way.
- Provide a dual 3D-feeling visual comparison: Money hidden under a mattress vs. Money invested in the S&P 500 (Compound Interest).
- Allow users to freely input and modify their Initial Amount and Monthly Contribution to see how their personal numbers grow.
- Use a Time Slider to physicalize the impact of waiting vs starting early.
- Achieve a "Million Dollar App" aesthetic with rich gradients, 3D bar extrusion effects (via Skia/Reanimated or deep shadows), glowing gold/neon assets, and heavy haptic feedback.
- Reward players for exploring the curve and realizing the impact of time.

## User Stories

### US-001: Define types for Compound Interest Simulation
**Description:** As a developer, I want TypeScript interfaces for the simulation so that all data is type-safe.

**Acceptance Criteria:**
- [x] Create `compoundTypes.ts` in `simulations/`
- [x] Define `CompoundSimConfig` with: `defaultInitialAmount`, `defaultMonthlyContribution`, `minYears`, `maxYears`, `annualInterestRate`.
- [x] Define `CompoundSimState` with: `initialAmount`, `monthlyContribution`, `years`, `totalInvested`, `totalCompoundValue`.
- [x] Typecheck passes

### US-002: Create configuration and default data
**Description:** As a player, I want realistic default numbers and interest rates (e.g., S&P 500 average) to learn based on reality.

**Acceptance Criteria:**
- [x] Create `compoundData.ts` in `simulations/`
- [x] Export `compoundConfig` with `annualInterestRate` = 0.08 (8%), `minYears` = 1, `maxYears` = 40, `defaultInitialAmount` = 10000, `defaultMonthlyContribution` = 500.
- [x] Typecheck passes

### US-003: Build simulation logic hook
**Description:** As a developer, I want a `useCompoundSim` hook that manages the math behind compound interest calculation dynamically as the user moves the slider.

**Acceptance Criteria:**
- [x] Create `useCompoundSim.ts` in `simulations/`
- [x] Calculate `totalInvested` = `initialAmount` + (`monthlyContribution` * 12 * `years`)
- [x] Calculate `totalCompoundValue` using the standard compound interest formula (monthly compounding).
- [x] Hook should expose updates for slider changes (years) and input changes.
- [x] Typecheck passes

### US-004: Build interactive 3D-Style Visualizer & Slider
**Description:** As a player, I want to physically drag a slider representing "Years" and watch two 3D-style columns grow side-by-side to dramatically see what I'm losing by not investing.

**Acceptance Criteria:**
- [x] Create `CompoundSimScreen.tsx` in `simulations/`
- [x] Add an intricate, glowing `Slider` allowing year selection from 1 to 40.
- [x] The core visual must be two 3D-styled pillars growing side by side: one gray/red for "כסף מתחת למזרן" (linear total) and one glowing gold for "השקעה עם ריבית דריבית" (exponential total).
- [x] Use `react-native-reanimated` for smooth height interpolation. Use overlapping views with gradients and deep box-shadows to simulate a 3D isometric or extruded bar chart.
- [x] As years hit 15+, the "Compound" bar should dramatically pull away from the linear bar, triggering a golden glow.
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-005: Add Interactive Inputs and High-End Gamification
**Description:** As a player, I want to input my own numbers and feel a premium, tactile response when the chart explodes with wealth.

**Acceptance Criteria:**
- [x] Add gorgeous input fields/steppers to change `monthlyContribution` and `initialAmount` in real-time.
- [x] Milestone triggers: When value crosses ₪1M, trigger `heavyHaptic()` and an endless looping `ConfettiExplosion` overlaid with a shiny "מיליונר!" badge.
- [x] Implement a "Fast Forward" (Run Simulation) animated button that auto-slides from 1 to 40 years rapidly, showing the explosive curve in cinematic fashion.
- [x] The entire screen must feel like a "Million Dollar App": use `LinearGradient` for deep backgrounds, neon/gold text strokes, and flawless 60FPS animations.
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-006: Build summary and lesson integration
**Description:** As a player, I want to end the simulation with a clear lesson and get XP rewards.

**Acceptance Criteria:**
- [x] Add a "Finish Simulation" button that appears after the user has explored at least year 20.
- [x] Show a summary GlowCard emphasizing the "Time is Money" lesson.
- [x] Reward: +30 XP (sim_complete) and +20 Coins via `useEconomyStore`.
- [x] Update `LessonFlowScreen.tsx`: module `mod-1-4` triggers `CompoundSimScreen` in sim phase.
- [x] Typecheck passes
- [x] Verify changes work in browser

## Non-Goals
- Real-time stock market data integration.
- Complex inflation and tax calculations (keep it simple to teach the core concept).

## Technical Notes
- Reuse existing components: `GlowCard`, `AnimatedPressable`, `ConfettiExplosion`.
- Use `useEconomyStore` for tracking rewards.
- Ensure RTL Hebrew support for all labels.
- Follow the structure used in `MinusTrapGameScreen` and `BudgetGameScreen`.
- Visual math: `A = P(1 + r/n)^(nt)`. For simplicity, you can assume annual compounding or monthly compounding for regular contributions.
