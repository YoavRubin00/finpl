# P0 Data Persistence — Remaining Work & Follow-ups

**Date:** 2026-05-22
**Branch merged to:** `dev` (commit `1b5da11`), not yet pushed to origin
**Status:** Code complete, NOT runtime-tested. Pending DB migrations, env vars, and Group L smoke tests.

This document lists everything NOT yet done after the P0 implementation, organized by priority.

---

## 0. BLOCKERS — must happen before the app works at all

These are required for the new code to function. Without them, sign-in and all sync calls fail.

1. **Apply DB migrations** to whatever database you're testing/deploying against:
   - `src/db/migrations/0001_add_preferences.sql` — adds `user_profiles.preferences jsonb`
   - `src/db/migrations/0002_add_user_stats.sql` — creates the `user_stats` table
2. **Set environment variables** wherever the API runs (local `vercel dev`, Vercel preview, and eventually prod):
   - `AUTH_JWT_SECRET` — long random string; MUST match across every place the API runs; never rotate without accepting a one-time logout of all users
   - `BACKFILL_V1_ENABLED` — `'true'` (kill switch; set to `'false'` to disable the one-time backfill if it misbehaves)

---

## 1. VERIFY — confirm before trusting the rollout

1. **Confirm the live API is the `api/` (Vercel) directory, not `app/api/**+api.ts`.**
   Evidence says `api/` is live (`EXPO_PUBLIC_API_URL=https://finpl.vercel.app`, `vercel.json` declares `functions: api/**/*.ts`, `web.output: "single"` disables Expo Router server routes). All P0 work is in `api/`. If `app/api/**+api.ts` is somehow the live set, the entire P0 refactor is on dead files and must be redone there. **Confirm by hitting `https://finpl.vercel.app/api/auth/refresh` (should 401 without a token) and checking the Vercel deployment's Functions tab.**
2. **Decide the fate of the dead `app/api/**+api.ts` routes.** If confirmed dead, delete them — they still carry the old insecure `authId`-from-body behavior and are a security/confusion footgun. ~28 files.

---

## 2. P0.5 — correctness gaps (fix soon; don't block initial test but should ship before/with prod)

1. **Profile-edit sync.** `useAuthStore.profile` (financialDream, financialGoal, knowledgeLevel, companionId, avatarId, ownedAvatars, etc.) is still local-only. It's cleared on sign-out (contamination fixed) and the one-time backfill pushes it to `user_profiles.preferences` once — but ongoing profile *edits* don't sync to the server. If a user edits their profile then reinstalls/switches devices, the edits are lost. Fix: migrate the ~20 consumers of `useAuthStore.profile` to `useProfile()` / `useUpdateProfile()` so edits round-trip to the server. Bounded ~1-day refactor.
2. **`useAuthStore.deleteAccount()`** does its own `AsyncStorage.getAllKeys() + multiRemove` but does NOT `queryClient.clear()` or `await logoutRevenueCat()`. Route it through `lifecycleSignOut()` (plus the server-side profile delete) for consistency.
3. **RevenueCat live in-session listener.** The old `startRevenueCatListener` (instant entitlement updates while the app is open) was removed when `useSubscriptionStore` was deleted. Today a mid-session Pro purchase reflects only after the next app foreground (AppState invalidates subscription after 5min background) or cold boot. If instant in-session reflection is needed, add a `Purchases.addCustomerInfoUpdateListener` in `lifecycle.ts` that calls `syncSubscription` + invalidates `['subscription']`.

---

## 3. P1 — server-back the "in-between" stores (needs new tables + endpoints + its own plan)

Per the spec, these were chosen for full server-backing but deferred to P1. Each currently survives as a local-only store (registered for sign-out reset, so no cross-user contamination, but no cross-device sync).

1. Daily quests / daily quiz / daily challenges
2. Arena, duels, squads, fantasy league
3. **Hearts** — currently fully local (`useHeartsStore`). Reinstall-to-refill exploit exists. Needs server-side hearts state + regen timestamp.
4. **Write the P1 implementation plan** (only the P0 plan exists: `docs/superpowers/plans/2026-05-21-data-persistence-p0.md`).

---

## 4. P2 — long-tail stores (lower priority)

1. Server-back: AI telemetry, adaptive personalization, real assets, saved items, referrals, crowd-question votes, weekly insights, retention, feed interactions, myth, clash, scenario-lab, macro-events, daily concepts/log, wisdom, news-quiz, fun, etc.
2. **`useBanditStore`** — finish the migration. The `bandit_variants` table and `api/bandit/state.ts` + `api/bandit/event.ts` already exist; just wire the client to read from the server instead of the local store.
3. **Write the P2 implementation plan.**

---

## 5. Tech debt & cleanup

1. **Drop the dead `syncToken` column** from `user_profiles` (replaced by JWT). Migration + remove any lingering references.
2. **Fix 3 pre-existing TypeScript errors** (present before this work, unrelated): `app/api/admin/bridge-stats+api.ts` (3), `app/api/ai/chat+api.ts` (2), `src/features/pyramid/ArenaStageCard.tsx` (2). Note these live in the possibly-dead `app/api/` tree.
3. **Stale comments** referencing deleted stores: `src/db/sync/syncCoinEvents.ts:8`, `src/features/retention-loops/RetentionToasts.tsx:26`.
4. **Set up a real test framework** (Jest/jest-expo or vitest). P0 used inline `npx tsx scripts/test-*.ts` scripts (jwt, backfill-merge, legacy-local-state) to avoid the Expo+Jest setup detour. Convert these to proper tests and add coverage for the hooks/lifecycle.
5. **Backfill retry backoff.** `runBackfillV1` retries on every cold launch until `backfillFlag.markDone()` succeeds. If the POST repeatedly 5xx's, it re-hits the server every boot. Add a max-attempts counter or backoff.
6. **Wire failures to Sentry.** `@sentry/react-native` is already installed. Route `backfill_failed` and `hydration_failed` (currently PostHog `captureEvent` only) to Sentry for real alerting during rollout.

---

## 6. Verification — Group L smoke tests (before any prod rollout)

Full checklist in `docs/superpowers/plans/2026-05-21-data-persistence-p0.md` (Group L). The critical ones:

1. **Cross-user contamination:** User A (Pro) signs out → User B (free) signs in → assert NOT Pro, no A data anywhere, no `subscription-storage`/`economy-store`/`chapter-store` keys in storage.
2. **Upgrade path (legacy-session migration):** install OLD build, accrue local data, install NEW build over it → assert still logged in, data preserved, backfill flag set, legacy keys wiped.
3. **Optimistic revert:** award XP offline → UI updates → mutation fails → UI reverts.
4. **Token expiry:** corrupt/expire the JWT → 401 → graceful sign-out, no crash.
5. **Backfill idempotency:** run backfill twice → no double-counting.
6. **RC isolation:** two different accounts on one device → distinct RC app-user-IDs, no entitlement leak.

---

## Rollout sequence (recommended)

1. Apply migrations to a **Neon branch** (not prod) → test against it
2. Run Group L smoke tests on web + a device dev build
3. Confirm item 1.1 (live API directory)
4. Apply migrations to prod DB
5. Set prod env vars (`AUTH_JWT_SECRET`, `BACKFILL_V1_ENABLED`)
6. Staged native rollout (internal → % → 100%), monitoring `backfill_*` / `sign_out_*` / `auth_token_invalid` events for 48h
