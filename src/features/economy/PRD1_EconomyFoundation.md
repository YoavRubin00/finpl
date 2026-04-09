# PRD 1: Economy Foundation

## Status
COMPLETED

## Scope
Dual-token store (XP + Coins + Streak), persistence, progression logic.

## Directories
- `src/features/economy/`
- `src/constants/economy.ts`
- `src/utils/progression.ts`

## Goals
- Establish the core economy loop: users earn XP and Coins by completing modules and challenges.
- Implement streak tracking for daily engagement.
- Create a persistent state management system (Zustand + AsyncStorage) for the economy.
- Establish level progression formulas based on XP.
