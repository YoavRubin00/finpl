# Data Persistence Architecture Redesign

**Date:** 2026-05-21
**Status:** Approved for implementation planning
**Owner:** naveh-elya

## Problem statement

FinPlay currently stores virtually all per-user state on the device (43+ Zustand stores using `persist()` middleware writing to MMKV/AsyncStorage). The local cache is treated as source of truth on app start, the backend is only opportunistically consulted, and sign-out does not clear any of the persisted state. This produces two observed symptoms:

1. **Cross-user contamination.** A user with a Pro subscription signs out; a different user signs in on the same device; the new user is treated as Pro. Beyond Pro plan: profile data, XP/coins/gems, streak, lesson progress, social features, and ~40 other slices leak across users for the same reason.
2. **Disappearing progress.** Users report that their lesson/chapter progress sometimes vanishes with no clear cause.

The full forensic audit identified **eight root causes** spread across the auth flow, the RevenueCat integration, the persistence layer, and the data migration logic. They are catalogued in the conversation that produced this spec. The fix touches the client persistence model, the API authentication model, and the database schema.

## Goals

- The server is the source of truth for every piece of data that defines who the user is or what they've earned.
- A user cannot impersonate another user by sending arbitrary `authId` values to the API.
- Sign-out fully clears every trace of the previous user's state from the device.
- Sign-in fetches the new user's canonical state from the server before any gameplay UI renders.
- Optimistic UI updates remain instant; failed writes revert cleanly.
- Existing users' local-only data is preserved during the rollout (one-time backfill).
- The fix ships in three independently-shippable phases so the most critical bugs reach users first.

## Non-goals

- Offline-first gameplay. The chosen consistency model is online-first with optimistic UI; brief network blips are handled gracefully, but multi-hour offline play is not a requirement and is not supported by this design.
- Changing the primary user identifier. `authId` continues to be the user's email. Migrating to a stable opaque UUID-as-primary-identifier is out of scope.
- Rebuilding RevenueCat from scratch. We keep the SDK and the existing webhook; we fix how the client uses them.

## Design decisions (locked)

| Decision | Choice |
|---|---|
| Consistency model | Online-first with optimistic UI |
| API authentication | JWT session tokens (HS256, 30-day expiry, refreshable) |
| Server-backing scope | All per-user state server-backed; only UI/transient state stays local |
| Migration strategy | One-time backfill: push local → server (conservative MAX-merge), then server canonical |
| Phasing | P0 → P1 → P2, each independently shippable |
| Server-state client layer | TanStack Query (react-query) for server-owned data; Zustand kept for UI/transient state |

## Architecture overview

```
┌──────────────────────────────────────────────────────────┐
│                       Client                              │
│  ┌───────────────────────────────────────────────────┐   │
│  │   UI components                                    │   │
│  └─────────────┬─────────────────────┬───────────────┘   │
│                │                     │                    │
│                ▼                     ▼                    │
│  ┌─────────────────────┐  ┌──────────────────────────┐   │
│  │  React Query hooks  │  │  Zustand stores          │   │
│  │  (server state)     │  │  (UI / transient state)  │   │
│  │  useProfile()       │  │  useAudioStore           │   │
│  │  useSubscription()  │  │  useTutorialStore        │   │
│  │  useEconomy()       │  │  useShopModalStore       │   │
│  │  useStreak()        │  │  chapter simulations     │   │
│  │  useProgress()      │  │  …                       │   │
│  │  …                  │  │                          │   │
│  └─────────┬───────────┘  └──────────┬───────────────┘   │
│            │                         │                    │
│            ▼                         ▼                    │
│  ┌─────────────────────┐  ┌──────────────────────────┐   │
│  │  API client         │  │  Store registry          │   │
│  │  (JWT in header)    │  │  (reset / wipe on logout)│   │
│  └─────────┬───────────┘  └──────────────────────────┘   │
│            │                                              │
│            │              ┌──────────────────────────┐   │
│            │              │  expo-secure-store       │   │
│            │              │  (JWT token only)        │   │
│            │              └──────────────────────────┘   │
└────────────┼──────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────┐
│                       Server                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  withAuth middleware                                  │  │
│  │  (verifies JWT, populates ctx.authId / ctx.userId)    │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                          │
│                   ▼                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/auth/verify   (mints JWT)                       │  │
│  │  /api/auth/refresh                                    │  │
│  │  /api/sync/profile          (existing, refactored)    │  │
│  │  /api/sync/economy          (new)                     │  │
│  │  /api/sync/subscription     (new)                     │  │
│  │  /api/sync/streak           (new)                     │  │
│  │  /api/sync/progress         (existing, refactored)    │  │
│  │  /api/sync/saved            (new, P2)                 │  │
│  │  /api/sync/referrals        (new, P2)                 │  │
│  │  /api/sync/daily-*          (new, P1)                 │  │
│  │  /api/sync/arena, duels, squads, fantasy (new, P1)    │  │
│  │  /api/migrate/backfill-v1   (new, called once)        │  │
│  │  /api/webhooks/revenuecat   (existing)                │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   ▼                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Postgres (Neon)                                      │  │
│  │  user_profiles, module_progress, paper_*, etc.        │  │
│  │  + new tables for daily/social/AI/etc.                │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Section 1 — Identity, sessions, and API auth

### JWT model

- Token contents: `{ sub: <userProfiles.id>, authId: <email>, iat, exp }`
- Algorithm: HS256
- Signing key: `AUTH_JWT_SECRET` env var
- Expiry: 30 days
- Refresh: server returns a refreshed token in a response header when the current token has less than 7 days remaining. Client swaps the stored token transparently.

### Token storage

Client stores the JWT in `expo-secure-store`, not AsyncStorage and not MMKV. Credentials belong in the OS keystore (iOS Keychain, Android Keystore). This also means the token has a different lifecycle from the local cache and is not affected by cache wipes.

### Endpoints

- `/api/auth/verify` (existing) — gains JWT minting. Returns `{ ok, profile, token }`.
- `/api/auth/refresh` (new) — POST with current token, returns new one.
- `api/_shared/withAuth.ts` (new) — middleware that wraps handlers as `(req, res, ctx) => …` where `ctx.authId: string` and `ctx.userId: string (uuid)` are guaranteed.
- All `api/sync/*` endpoints adopt `withAuth` and ignore any `authId` in the request body — they read `ctx.authId` instead.

### Client API client

`src/lib/api/client.ts`:
- Loads token from secure-store on init.
- Attaches `Authorization: Bearer <token>` to every request.
- Intercepts 401 responses to trigger sign-out.
- Reads the refresh-token response header and swaps the stored token when present.
- Per-resource modules: `src/lib/api/profile.ts`, `economy.ts`, `subscription.ts`, `progress.ts`, etc., each exposing typed read and mutation functions.

## Section 2 — Source of truth, server-backed state, React Query layer

### The rule

For any data that defines who the user is or what they've earned, the server is the only authority. The client holds a cache. The cache rehydrates from server on sign-in, on app foreground after 5+ minutes background, and on explicit pull-to-refresh.

### React Query resources

| Resource | Query key | Server endpoint | Mutations |
|---|---|---|---|
| Profile | `['profile']` | `GET /api/sync/profile` | `updateProfile` |
| Subscription | `['subscription']` | `GET /api/sync/subscription` (new) | `syncFromRevenueCat` |
| Economy | `['economy']` | `GET /api/sync/economy` (new) | `awardXp`, `awardCoins`, `spendCoins`, `awardGems`, `setVirtualBalance` |
| Streak | `['streak']` | `GET /api/sync/streak` (new) | `recordDailyActivity` (idempotent per date) |
| Progress | `['progress']` | `GET /api/sync/progress` (existing) | `upsertModuleProgress` |
| User stats | `['user-stats']` | `GET /api/sync/user-stats` (new — sessionSeconds, moduleDurations) | `recordSessionTime`, `recordModuleDuration` |
| Saved items | `['saved']` (P2) | `GET /api/sync/saved` (new) | `toggleSaved` |
| Referrals | `['referrals']` (P2) | `GET /api/sync/referrals` (new) | `claimDividend`, `linkReferrer` |
| Daily quests | `['daily-quests']` (P1) | `GET /api/sync/daily-quests` (new) | `updateQuestProgress`, `completeQuest` |
| Daily quiz | `['daily-quiz']` (P1) | `GET /api/sync/daily-quiz` (new) | `submitDailyQuiz` |
| Daily challenges | `['daily-challenges']` (P1) | `GET /api/sync/daily-challenges` (new) | `updateChallengeProgress` |
| Arena | `['arena']` (P1) | `GET /api/sync/arena` (new) | `recordArenaResult` |
| Duels | `['duels']` (P1) | `GET /api/sync/duels` (new) | `createDuel`, `completeDuel` |
| Squads | `['squads']` (P1) | `GET /api/sync/squads` (new) | `joinSquad`, `leaveSquad`, `createSquad` |
| Fantasy league | `['fantasy']` (P1) | `GET /api/sync/fantasy` (new) | `saveDraft`, `recordWeekScore` |
| AI telemetry | (P2) | `POST /api/telemetry/ai` (new, write-only) | `recordEvent` |
| Adaptive | `['adaptive']` (P2) | `GET /api/sync/adaptive` (new) | `updateKnowledgeVector` |
| Real assets | `['real-assets']` (P2) | `GET /api/sync/real-assets` (new) | `addHolding`, `removeHolding` |

The P2 row of Bin A in Section 4 lists additional stores beyond this table (crowd-question, weekly insights, retention, feed interactions, myth/clash/scenario/macro events, daily concepts/log, wisdom, bridge per-user, trading, modifiers, bandit, news quiz, fun, notifications). Each will get its own `['<resource>']` query key and matching `GET /api/sync/<resource>` endpoint following the same pattern; full endpoint enumeration is deferred to the P2 implementation plan. `useBanditStore` is a partial case: a `bandit_variants` table already exists and `api/bandit/state.ts` + `api/bandit/event.ts` already write to it — P2 finishes the migration by removing the local cache and reading from the existing endpoints via react-query.

### Optimistic update pattern

All mutations use the optimistic update pattern. Concrete example for `awardXp`:

```ts
const { mutate: awardXp } = useMutation({
  mutationFn: (delta: number) => api.economy.awardXp(delta),
  onMutate: async (delta) => {
    await queryClient.cancelQueries({ queryKey: ['economy'] });
    const prev = queryClient.getQueryData<Economy>(['economy']);
    queryClient.setQueryData<Economy>(['economy'], (old) =>
      old ? { ...old, xp: old.xp + delta } : old
    );
    return { prev };
  },
  onError: (_err, _delta, ctx) => {
    if (ctx?.prev) queryClient.setQueryData(['economy'], ctx.prev);
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['economy'] }),
});
```

### Server-side write safety: deltas, not absolutes

Every mutation endpoint accepts deltas, not absolute values. `awardXp(delta: 50)`, not `setXp(total: 1200)`. The server reads the current row, adds the delta inside a transaction, and returns the new total. Concurrent writes from two clients both apply without clobbering. Implementation uses `UPDATE … SET xp = xp + $1 RETURNING xp`.

This is what makes optimistic UI safe and is a meaningful departure from the current `POST profile { xp: 1200 }` pattern that produced the past Aviv-incident data loss.

### Refetch policy

- `staleTime: 30s` for economy, subscription, streak
- `staleTime: 5min` for progress
- Refetch on app foreground after background > 5min via `AppState` listener
- Refetch on network reconnect via `NetInfo` listener
- Refetch on sign-in (initial mount)

### What stays in Zustand

Local-only, UI/transient state. Examples: `useTutorialStore`, `useAudioStore`, `useShopModalStore`, `useUpgradeModalStore`, `useNudgeQueueStore`, `useTradingHubUiStore`, `useMonetizationIntentStore`, `useLiveMarketStore`, and all ~30 chapter-simulation hooks (`useBudgetGame`, `useCarLoanGame`, `useCompoundSim`, etc.).

`useAuthStore` is kept as Zustand but slimmed down to session-only fields: `{ token, userId, authId, isAuthenticated, hasCompletedOnboarding }`. The `profile` slice is moved to react-query `['profile']`.

## Section 3 — Auth lifecycle

### Sign-in flow

```
LoginScreen → user enters email / signs in with Google
    ↓
POST /api/auth/verify { provider, token, email }
    ↓
Server: upsert userProfiles, MINT JWT, return { profile, token }
    ↓
Client: write token to expo-secure-store
    ↓
Client: configure RevenueCat with appUserID = profile.id  (UUID, NOT email, NOT undefined)
    ↓
Client: await Purchases.logIn(profile.id) → returns customerInfo
    ↓
Client: react-query prefetch ['profile'], ['subscription'], ['economy'], ['streak'], ['progress']
    ↓
Client: useAuthStore.signIn({ profile, userId })   // ONLY now is the user "signed in"
    ↓
router.replace('/(tabs)/')
```

The user does not land in `/(tabs)/` until the server has answered "here is your real state." A splash/loading screen covers the prefetch window.

### Sign-out flow

```
User taps "Sign out"
    ↓
1. await Purchases.logOut()                                  // AWAITED
2. Purchases.configure({ appUserID: '$anon:' + uuid() })     // fresh anonymous bucket
3. queryClient.clear()                                       // drop all react-query caches
4. resetAllLocalStores()                                     // every kept Zustand store calls .reset()
5. await AsyncStorage.multiRemove(getLocalStorageKeys())     // wipe known local-only persist keys
6. await SecureStore.deleteItemAsync('auth_token')
7. useAuthStore.getState().clear()
    ↓
router.replace('/(auth)/onboarding')
```

Step 2 is the critical fix for the observed Pro-plan contamination. `Purchases.logOut()` alone reverts the SDK to anonymous mode but reuses the same anonymous app-user-ID across users on the device. Generating a fresh `'$anon:' + uuid()` after logout prevents the next user from inheriting the previous user's entitlements.

Step 5 wipes only known keys (not blanket `AsyncStorage.clear()`) so we don't break other libraries' (Expo, Firebase) storage. The list of known keys comes from a central registry (Section 4).

### App start flow (cold launch)

```
App mounts
    ↓
1. Read token from secure-store
    ↓
2. If no token → render /(auth)/onboarding, done.
    ↓
3. If token exists:
   a. Configure RevenueCat with the stored userProfiles.id
   b. await Purchases.logIn(userId)
   c. Prefetch ['profile'] — if 401, sign out
   d. If ['profile'] succeeds:
      - If backfill_v1_done flag absent → run backfill (Section 5)
      - Prefetch ['subscription'], ['economy'], ['streak'], ['progress'] in parallel
   e. useAuthStore.signIn({ profile, userId })
   f. Render /(tabs)/
```

### App foreground (from background > 5min)

```
AppState 'active' fires after >5min background
    ↓
queryClient.invalidateQueries() for ['profile'], ['subscription'], ['economy'], ['streak']
    ↓
React Query refetches in background; UI updates if anything changed
```

### RevenueCat fixes (summary)

| Bug | Fix |
|---|---|
| `Purchases.configure({ appUserID: undefined })` at module load → anonymous device bucket | Don't configure on module load. Configure inside the auth flow, after `userProfiles.id` is known. |
| `loginRevenueCat()` after rehydration → race | Configure + logIn happen before the user lands in `/(tabs)/`. |
| `logoutRevenueCat()` fire-and-forget | Awaited in sign-out flow. |
| Anonymous bucket reused across users | After logOut, configure with fresh `'$anon:' + uuid()`. |
| Local `tier`/`status` persisted in MMKV → contamination | Subscription store deleted. `isPro` lives in react-query cache only, cleared on sign-out. Server is source of truth via `userProfiles.isPro` + RC webhook. |
| `DEV_PRO_EMAILS` hardcoded in subscription rehydrate hook | Removed from client. Replaced with server-side override (admin-only column or env-flagged route) if needed. |
| `devResetProgress()` reachable from production | Gated behind `__DEV__`. |

## Section 4 — Zustand store contract

### Bin A — DELETED (state moves to React Query)

**P0:** `useSubscriptionStore`, `useEconomyStore` (split into `useEconomy` + `useStreak` query resources), `useChapterStore` (becomes `useProgress`), `useUserStatsStore` (becomes `useUserStats`). The `profile` slice of `useAuthStore` moves to react-query `['profile']`.

**P1:** `useDailyQuestsStore`, `useDailyQuizStore`, `use-daily-challenges-store`, `useArenaStore`, `useDuelsStore`, `useSquadsStore`, `useFantasyStore`, `useDraftStore`.

**P2:** `useAITelemetryStore`, `useAdaptiveStore`, `useRealAssetsStore`, `useSavedItemsStore`, `useReferralStore`, `useCrowdQuestionStore`, `useWeeklyInsightStore`, `useRetentionStore`, `useFeedInteractionsStore`, `useMythStore`, `useClashStore`, `useScenarioLabStore`, `useMacroEventStore`, `useDailyConceptStore`, `useDailyLogStore`, `useWisdomStore`, `useBridgeStore` (per-user progress portions), `useTradingStore`, `useModifiersStore`, `useBanditStore`, `useNewsQuizStore`, `useFunStore`, `useNotificationStore`.

### Bin B — KEPT (local-only, refactored to new contract)

Every kept store must implement a `reset()` action and register with the central registry.

```ts
interface LocalStoreContract {
  reset: () => void;   // returns to initial state
}

// At module bottom:
registerLocalStore('tutorial-store-v1', useTutorialStore, 'tutorial-store-v1');
```

**Bin B membership (P0):**
- `useAuthStore` (slimmed to session-only fields)
- `useTutorialStore`, `useAudioStore`
- `useShopModalStore`, `useUpgradeModalStore`, `useNudgeQueueStore`, `useTradingHubUiStore`, `useMonetizationIntentStore`
- All ~30 chapter-simulation hooks (no persistence, just reset)
- `useLiveMarketStore`, `useLifestyleBreakStore`

### The registry

```ts
// src/lib/stores/registry.ts
type LocalStoreRef = {
  storageKey: string | null;
  reset: () => void;
};

const registry = new Map<string, LocalStoreRef>();

export function registerLocalStore(
  name: string,
  store: { getState: () => { reset: () => void } },
  storageKey: string | null,
): void {
  registry.set(name, {
    storageKey,
    reset: () => store.getState().reset(),
  });
}

export function resetAllLocalStores(): void {
  for (const ref of registry.values()) ref.reset();
}

export function getLocalStorageKeys(): string[] {
  return Array.from(registry.values())
    .map((r) => r.storageKey)
    .filter((k): k is string => k !== null);
}
```

### Versioned storage keys

Every kept store's persist key adopts `-v<n>` namespacing (e.g. `tutorial-store-v1`). Version bumps when the partialized shape changes. The old key is added to a cleanup list so it can be removed on first launch. This prevents the silent-data-loss class where v2-shape data is rehydrated into v3 schema.

## Section 5 — Backfill migration, schema additions, and cleanup

### One-time backfill

**Trigger:** on app start, after token validation, after `['profile']` prefetch succeeds, before `['economy']`/`['progress']` prefetch. Gated by a `backfill_v1_done` flag in `expo-secure-store`.

**Algorithm (client):**

```ts
async function runBackfillV1(client: ApiClient) {
  if (await SecureStore.getItemAsync('backfill_v1_done')) return;

  const local = await readLegacyLocalState();
  // local = { xp?, coins?, gems?, currentStreak?, longestStreak?,
  //           virtualBalance?, completedModules?: ModuleProgress[],
  //           profile?: PartialProfile, ... }

  await client.post('/api/migrate/backfill-v1', local);
  await SecureStore.setItemAsync('backfill_v1_done', '1');
  await AsyncStorage.multiRemove(LEGACY_KEYS_V0);
}
```

**Algorithm (server, `/api/migrate/backfill-v1`):**

```
For each numeric field (xp, coins, gems, currentStreak, longestStreak, virtualBalance):
  newValue = MAX(server.field, body.field)
  // Never decreases. Never overwrites with NULL.

For module progress array:
  For each local module:
    INSERT … ON CONFLICT (user_id, module_id) DO UPDATE
      SET
        status = CASE
          WHEN module_progress.status = 'completed' THEN 'completed'
          WHEN EXCLUDED.status = 'completed' THEN 'completed'
          ELSE COALESCE(EXCLUDED.status, module_progress.status)
        END,
        best_score = GREATEST(module_progress.best_score, EXCLUDED.best_score),
        xp_earned = GREATEST(module_progress.xp_earned, EXCLUDED.xp_earned)

For profile fields:
  Only set if server's current value is NULL/empty.

Wrap in a single transaction.
Return the resulting profile + progress so the client pre-warms its cache.
```

**Failure handling:** if the POST fails, the client does NOT set `backfill_v1_done`, does NOT wipe legacy keys, and retries on next app start. Local data is a safety net until backfill succeeds.

**Idempotency:** the MAX/COMPLETED merge logic guarantees that re-running the endpoint cannot regress state.

### `LEGACY_KEYS_V0`

The list below is the best-known set of persist keys as of the audit. It is finalized during P0 implementation by greping the codebase for `persist({ name: …`) — any store missed here is one we may forget to wipe. The implementation plan includes a checklist step "grep all persist names, diff against `LEGACY_KEYS_V0`, reconcile."

```ts
const LEGACY_KEYS_V0 = [
  'auth-store-v2',
  'subscription-storage',
  'economy-store',
  'chapter-store',
  'user-stats-store',
  'arena-store',
  'trading-store',
  'daily-quiz-store',
  'daily-quests-store',
  'referral-store',
  'saved-items-store',
  'fantasy-store',
  'duels-store',
  'squads-store',
  'crowd-question-store',
  'daily-concept-store',
  'daily-log-store',
  'daily-challenges-store',
  'wisdom-store',
  'retention-store',
  'scenario-lab-store',
  'macro-event-store',
  'myth-store',
  'clash-store',
  'adaptive-store',
  'ai-telemetry-store',
  'weekly-insight-store',
  'real-assets-store',
  'monetization-intent-store',
  'notifications-store',
  'bandit-store',
  'tutorial-store',
  'nudge-queue-store',
  'audio-store',
  'news-quiz-store',
  'fun-store',
  'lifestyle-break-store',
  'trading-hub-ui-store',
  'market-mission-store',
  'bridge-store',
  'diamond-hands-cooldown-store',
];
```

After backfill succeeds, these are wiped. Kept stores use new `-v1` keys (Section 4) and are untouched by the wipe.

### Schema additions

**P0 — column additions to `user_profiles`:**
- `preferences jsonb` — stores knowledgeLevel, ageGroup, learningTime, learningStyle, companionId, avatarId, ownedAvatars, dailyGoalMinutes, financialDream, financialGoal, deadlineStress, birthYear. JSONB chosen for compactness; can migrate to typed columns later.

**P1 — new tables:**

```sql
CREATE TABLE daily_quest_state (
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  quest_id text NOT NULL,
  date_il date NOT NULL,
  status text NOT NULL,
  progress jsonb,
  earned_xp integer DEFAULT 0,
  completed_at timestamptz,
  PRIMARY KEY (user_id, quest_id, date_il)
);

CREATE TABLE daily_quiz_state (
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  date_il date NOT NULL,
  score integer,
  questions_answered integer DEFAULT 0,
  completed_at timestamptz,
  PRIMARY KEY (user_id, date_il)
);

CREATE TABLE daily_challenge_state (
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  date_il date NOT NULL,
  status text NOT NULL,
  progress jsonb,
  PRIMARY KEY (user_id, challenge_id, date_il)
);

CREATE TABLE arena_state (
  user_id uuid PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  rating integer DEFAULT 1000,
  season_id text NOT NULL,
  wins integer DEFAULT 0,
  losses integer DEFAULT 0,
  last_match_at timestamptz
);

CREATE TABLE duels_match (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_a uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  player_b uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status text NOT NULL,
  winner_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE squads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE squads_membership (
  user_id uuid PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  squad_id uuid NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  role text NOT NULL,
  joined_at timestamptz DEFAULT now()
);

CREATE TABLE fantasy_draft (
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  season_id text NOT NULL,
  picks jsonb NOT NULL,
  drafted_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, season_id)
);

CREATE TABLE fantasy_score (
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  season_id text NOT NULL,
  week integer NOT NULL,
  points integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, season_id, week)
);
```

**P2 — new tables:**

```sql
CREATE TABLE ai_telemetry_event (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE adaptive_profile (
  user_id uuid PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  knowledge_vector jsonb,
  preferences jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE real_assets_holding (
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  asset_id text NOT NULL,
  quantity numeric(18, 8) NOT NULL DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, asset_id)
);

CREATE TABLE saved_items (
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  item_id text NOT NULL,
  saved_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, item_type, item_id)
);
```

`referrals` and `crowd_question_votes` already exist; P2 wires endpoints to them.

### Legacy code cleanup (P0)

- Gate `devResetProgress()` in `src/features/auth/useAuthStore.ts:185-192` behind `__DEV__`.
- Remove `DEV_PRO_EMAILS` from `useSubscriptionStore onRehydrateStorage`.
- Remove `partialize` of subscription/economy/profile fields from deleted stores (implicit when stores are deleted).
- Remove the `setVirtualBalance` rehydration at `src/features/auth/LoginScreen.tsx:78-81`.
- Remove the `userEmail`-effect at `app/_layout.tsx:239-246` — RC configuration moves into the new auth flow.

## Testing & rollout

### Feature flag

P0 ships behind a feature flag (`useNewAuthFlow`) so we can revert if backfill goes wrong. Default true in staging, false in production for the first ~48 hours, then flipped. If no feature-flag system exists, fallback is a hardcoded constant flipped in a hotfix build. To be decided in the implementation plan.

### Smoke tests (per phase)

- **Contamination:** sign-out → sign-in as different user → assert `isPro: false`, `xp: 0`, no contaminated state on any screen
- **Optimistic revert:** award XP offline (network disabled) → assert UI reverts and an error toast appears
- **Token expiry:** cold launch with stale/revoked token → assert 401 triggers sign-out, not a crash
- **Backfill:** install old build with progress → upgrade to new build → assert server has the progress and react-query cache matches local
- **Backfill idempotency:** run backfill twice → state unchanged after second run
- **RevenueCat anonymous reset:** sign-out as Pro → sign-in as a different account that has never had Pro → assert `isPro: false` on first render

## Phase summary

| Phase | Scope | Target |
|---|---|---|
| P0 | JWT auth, sign-out clearing, RC fix, server-back profile/subscription/economy/streak/progress/virtualBalance, backfill, cleanup | 3-5 days |
| P1 | Server-back daily-quests/quiz/challenges, arena, duels, squads, fantasy (new tables + endpoints + hooks) | 1-2 weeks |
| P2 | Server-back AI telemetry, adaptive, real assets, saved items, referrals, crowd-question, remaining stores | ~1 week |

Each phase is independently shippable.

## Open items for the implementation plan

- Feature-flag mechanism choice (env-var, hardcoded constant, or proper flag system).
- Exact splash-screen UX during sign-in prefetch window.
- Whether to keep `preferences jsonb` or split into typed columns on `user_profiles` (P0 decision).
- Logging/observability strategy for the rollout: which events get captured (backfill success/fail, sign-out errors, RC anomalies).

These are deliberately deferred to the implementation plan so the spec stays at the architectural level.
