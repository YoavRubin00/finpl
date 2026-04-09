# PRD 6: Identity & Onboarding

## Status
COMPLETED

## Scope
Auth flow, ProfilingFlow (age + persona + goal), EconomyHeader, AuthGuard.

## Directories
- `src/features/auth/`
- `src/features/onboarding/`
- `src/components/ui/EconomyHeader.tsx`

## Goals
- Present a smooth registration and login experience (email + Google auth).
- Collect initial profiling data (age, financial persona, goal, knowledge level) to tailor the experience.
- Implement AuthGuard to lock down app features until profiling is complete.
- Introduce the global EconomyHeader early in the experience.
