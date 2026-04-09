# PRD 7.1 - Simulation: Budget Minister 🎮

## Status: ✅ IMPLEMENTED

## Files Created
- `simulations/budgetTypes.ts` — Types: `BudgetDilemma`, `DilemmaOption`, `BudgetGameState`, `BudgetScore`
- `simulations/budgetData.ts` — 8 realistic Gen-Z Israeli financial dilemmas + game config (salary: ₪10K)
- `simulations/useBudgetGame.ts` — Core game hook: state management, bucket tracking, S/A/B/C/F scoring
- `simulations/BudgetGameScreen.tsx` — Full premium UI with animated balance header, progress bars (pulse red on overflow), dilemma cards with slide transitions, and score breakdown screen
- `simulations/index.ts` — Barrel exports

## Files Modified
- `LessonFlowScreen.tsx` — Added `"sim"` to `FlowPhase`, module `mod-1-1` triggers `BudgetGameScreen` after quizzes
- `../../types/economy.ts` — Added `"sim_complete"` to `XPSource` union

## Game Flow
1. User gets virtual salary of ₪10,000
2. Faces 8 dilemmas: rent, restaurants, subscriptions, FOMO flights, savings, car maintenance, shopping, bills
3. Each choice updates Needs/Wants/Savings buckets with animated progress bars
4. Overflow triggers pulsing red warning
5. End screen shows S/A/B/C/F grade + detailed breakdown vs the 50/30/20 golden rule
6. Grants +20 XP and +15 Coins on completion
