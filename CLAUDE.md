# CLAUDE.md - FinPlay Engineering Standards

## Project Context
FinPlay: Gamified Fintech (Gen-Z). High-performance, zero-latency.
Tech Stack: React Native (Expo), TypeScript (Strict), Zustand, NativeWind.

## Critical Rules
- **TypeScript:** `strict: true`. ABSOLUTELY NO `any`. Use interfaces for models.
- **State:** Zustand for global logic (XP/Coins). Atomic updates only.
- **UI:** NativeWind (Tailwind). Follow "Gaming-Neon" branding from docs.
- **Folder Structure:** Feature-based (`src/features/[featureName]`).
- **Hebrew copy:** Read `docs/BRAND.md` BEFORE writing any user-facing string. It defines tone, gender handling (singular for onboarding/AI voice, plural for system messages), and Captain Shark's voice.
- **Marketing ≠ app (HARD RULE for every agent + skill):** Generated marketing/social media — Higgsfield carousels, reels, brand cards, CTA/Story graphics, WhatsApp community images, email-card source PNGs — must **NEVER** be saved under `assets/` (that bundles into the .aab/.ipa and bloats the app). Save them to **`marketing-output/`** (git-ignored + eas-ignored). `assets/` is for genuine IN-APP assets only. Email/social images are served from Vercel Blob via URL, not bundled. The ONE exception: `finplay-mascot-webp` (transparent in-app mascot loops) legitimately writes to `assets/webp/`.

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

