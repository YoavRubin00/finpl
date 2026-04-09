# CLAUDE.md - FinPlay Engineering Standards

## Project Context
FinPlay: Gamified Fintech (Gen-Z). High-performance, zero-latency.
Tech Stack: React Native (Expo), TypeScript (Strict), Zustand, NativeWind.

## Critical Rules
- **TypeScript:** `strict: true`. ABSOLUTELY NO `any`. Use interfaces for models.
- **State:** Zustand for global logic (XP/Coins). Atomic updates only.
- **UI:** NativeWind (Tailwind). Follow "Gaming-Neon" branding from docs.
- **Folder Structure:** Feature-based (`src/features/[featureName]`).

## Ralph Loops & Workflows
- Break tasks into 10-minute autonomous chunks.
- **Step 1:** Define Schema/Types.
- **Step 2:** Logic/Store.
- **Step 3:** UI/Animations.
- **Step 4:** `npx tsc --noEmit` to verify.

## Naming Conventions
- Stores: `use[Feature]Store.ts`
- Components: PascalCase.
- Functions: camelCase.

