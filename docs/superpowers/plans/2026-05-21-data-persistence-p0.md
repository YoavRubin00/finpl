# Data Persistence P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate cross-user data contamination and the disappearing-progress bug class by moving identity, subscription, economy, streak, profile, lesson progress, and user stats to server source-of-truth, with JWT-authenticated sync endpoints, a deterministic sign-out/sign-in lifecycle, and a one-time conservative backfill of existing local data.

**Architecture:** Online-first with optimistic UI. Server (Vercel functions + Neon Postgres + Drizzle ORM) is the canonical store for per-user state. Client uses TanStack Query for server state, slim Zustand for UI/transient state, JWT in `expo-secure-store` for auth, and a one-time backfill on first launch of this build.

**Tech Stack:** React Native (Expo) + TypeScript strict + Zustand (UI only) + TanStack Query (server state) + jsonwebtoken (server) + expo-secure-store (client) + uuid + Drizzle ORM + Neon Postgres + Vercel functions.

**Spec:** `docs/superpowers/specs/2026-05-21-data-persistence-architecture-design.md`

---

## Phase scope

This plan covers **P0 only**. P1 (daily/social server-backing) and P2 (long-tail stores) get their own plans written after P0 ships, so they can build on the patterns proven in P0 code rather than being speculative.

In scope for P0:
- JWT-based session auth (`/api/auth/verify` mints, `/api/auth/refresh` rotates, `withAuth` middleware enforces)
- Server-backed: profile (incl. preferences JSONB), subscription, economy (xp/coins/gems/virtualBalance), streak, lesson progress, user stats
- New endpoints: `/api/sync/economy`, `/api/sync/subscription`, `/api/sync/streak`, `/api/sync/user-stats`, `/api/auth/refresh`, `/api/migrate/backfill-v1`
- Refactored endpoints: `/api/auth/verify`, `/api/sync/profile`, `/api/sync/progress`
- Client API client + per-resource modules + React Query hooks for the above
- Auth lifecycle refactor: deterministic sign-in/sign-out/app-start flows; RevenueCat fix
- Deletion of `useSubscriptionStore`, `useEconomyStore`, `useChapterStore`, `useUserStatsStore` (replaced by hooks)
- Slimmed-down `useAuthStore` (session-only)
- Local store registry + `reset()` contract on every kept Zustand store
- One-time backfill orchestrator on first launch
- ProfileBootScreen for the sign-in prefetch window
- AppState foreground + NetInfo reconnect listeners for refetch
- Cleanup: `__DEV__`-gate `devResetProgress`, remove `DEV_PRO_EMAILS`, remove old `userEmail` effect

Out of scope (deferred to P1/P2):
- Daily quests/quiz/challenges, arena, duels, squads, fantasy server-backing
- AI telemetry, adaptive, real assets, saved items, referrals, crowd-question server-backing
- All ~20 other Bin A P2 stores

---

## File structure

### Server (new files)

| Path | Responsibility |
|---|---|
| `api/_shared/jwt.ts` | `signSession(payload)`, `verifySession(token)` — HS256 wrapper around `jsonwebtoken` |
| `api/_shared/withAuth.ts` | Middleware that verifies JWT, populates `ctx.authId` and `ctx.userId`, returns 401 otherwise; emits refresh header when expiry < 7d |
| `api/_shared/db.ts` | Shared `getDb()` helper (currently duplicated in every endpoint) |
| `api/_shared/types.ts` | Shared request/response types for sync endpoints |
| `api/auth/refresh.ts` | Rotates a near-expiry JWT |
| `api/sync/economy.ts` | GET economy (xp/coins/gems/virtualBalance/level); POST applies signed deltas in a transaction |
| `api/sync/subscription.ts` | GET subscription (isPro/proExpiresAt); POST reconciles from RevenueCat customerInfo |
| `api/sync/streak.ts` | GET streak; POST `recordDailyActivity` idempotently |
| `api/sync/user-stats.ts` | GET user stats; POST `recordSessionTime`/`recordModuleDuration` |
| `api/migrate/backfill-v1.ts` | One-time conservative MAX-merge of client local data into server state |

### Server (modified files)

| Path | Change |
|---|---|
| `api/auth/verify.ts` | Mint JWT, return in response body |
| `api/sync/profile.ts` | Adopt `withAuth`, ignore body `authId`, handle `preferences` JSONB |
| `api/sync/progress.ts` | Adopt `withAuth`, ignore body `authId` |
| `src/db/schema.ts` | Add `preferences jsonb` column to `userProfiles` |

### Server (env vars)

| Var | Purpose |
|---|---|
| `AUTH_JWT_SECRET` | HS256 signing key |
| `BACKFILL_V1_ENABLED` | `'true'`/`'false'` kill switch on backfill endpoint (default `'true'`) |

### Client (new files)

| Path | Responsibility |
|---|---|
| `src/lib/auth/secureStore.ts` | `getToken()`, `setToken()`, `clearToken()` wrapping `expo-secure-store` |
| `src/lib/auth/legacyLocalState.ts` | Reads pre-migration MMKV/AsyncStorage keys into typed `LegacyLocalState` |
| `src/lib/auth/backfill.ts` | `runBackfillV1()` orchestrator; uses `secureStore` for flag, `legacyLocalState` for read, `api.migrate` for POST |
| `src/lib/auth/lifecycle.ts` | `bootFromToken()`, `signInWithProfile()`, `signOut()` — the orchestration that ties RC, JWT, react-query prefetch, store reset together |
| `src/lib/api/client.ts` | Typed fetch wrapper; attaches `Authorization: Bearer`; intercepts 401; reads refresh header |
| `src/lib/api/profile.ts` | `getProfile()`, `updateProfile(patch)` |
| `src/lib/api/economy.ts` | `getEconomy()`, `awardXp(delta)`, `awardCoins(delta)`, `spendCoins(delta)`, `awardGems(delta)`, `spendGems(delta)`, `setVirtualBalance(value)` |
| `src/lib/api/subscription.ts` | `getSubscription()`, `syncFromRevenueCat(customerInfo)` |
| `src/lib/api/streak.ts` | `getStreak()`, `recordDailyActivity(dateIl)` |
| `src/lib/api/progress.ts` | `getProgress()`, `upsertModuleProgress(payload)` |
| `src/lib/api/userStats.ts` | `getUserStats()`, `recordSessionTime(seconds)`, `recordModuleDuration(moduleId, seconds)` |
| `src/lib/api/migrate.ts` | `postBackfillV1(payload)` |
| `src/lib/queryClient.ts` | `QueryClient` factory with default `staleTime`/`gcTime` per spec; exported singleton + provider hook |
| `src/lib/stores/registry.ts` | `registerLocalStore`, `resetAllLocalStores`, `getLocalStorageKeys` |
| `src/features/auth/useProfile.ts` | `useProfile()` + `useUpdateProfile()` |
| `src/features/economy/useEconomy.ts` | `useEconomy()` + `useAwardXp()` etc. |
| `src/features/economy/useStreak.ts` | `useStreak()` + `useRecordDailyActivity()` |
| `src/features/subscription/useSubscription.ts` | `useSubscription()` + `useSyncFromRevenueCat()` |
| `src/features/chapter-1-content/useProgress.ts` | `useProgress()` + `useUpsertModuleProgress()` |
| `src/features/user-stats/useUserStats.ts` | `useUserStats()` + `useRecordSessionTime()` |
| `src/features/auth/ProfileBootScreen.tsx` | Splash component shown during sign-in prefetch window |
| `scripts/test-jwt.ts` | TDD-style script for JWT sign/verify roundtrip |
| `scripts/test-backfill-merge.ts` | TDD-style script for the merge logic |
| `scripts/test-legacy-local-state.ts` | TDD-style script for parsing legacy MMKV keys |

### Client (modified files)

| Path | Change |
|---|---|
| `app/_layout.tsx` | Wrap with `QueryClientProvider`; remove RC `useEffect` at lines 239-246; call `bootFromToken()` on mount |
| `src/services/revenueCat.ts` | Allow re-configuring with a new appUserID (remove the `isConfigured` short-circuit, or expose a `reconfigureRevenueCat`) |
| `src/features/auth/useAuthStore.ts` | Slim to session-only fields; replace `signIn`/`signOut`/`devResetProgress` with calls into `lifecycle.ts`; gate `devResetProgress` behind `__DEV__` |
| `src/features/auth/LoginScreen.tsx` | Replace `setVirtualBalance` rehydration block with `signInWithProfile()` call from lifecycle |
| `src/features/auth/loginUserEmail.ts` (and `loginUserGoogle.ts` if present) | Persist returned JWT |
| `src/features/more/MoreScreen.tsx` | Await `lifecycle.signOut()` before navigation |
| `src/features/subscription/useSubscriptionStore.ts` | **DELETED** (after consumers migrated) |
| `src/features/economy/useEconomyStore.ts` | **DELETED** (after consumers migrated) |
| `src/features/chapter-1-content/useChapterStore.ts` | **DELETED** (after consumers migrated) |
| `src/features/user-stats/useUserStatsStore.ts` | **DELETED** (after consumers migrated) |
| Every Bin B Zustand store (audit list) | Add `reset()` action; call `registerLocalStore` at module bottom |

### Client (consumer migration)

Every component/screen reading from the deleted stores switches to hooks. List built dynamically via grep in each migration task.

---

## TDD note

This repo has no test framework. Setting up Jest with Expo is its own day of work and is **out of scope for P0** — that's a separate ticket. For the high-risk pure functions (JWT, backfill merge, legacy state reader), this plan uses lightweight inline test scripts runnable via `npx tsx scripts/test-*.ts` that fail loudly on mismatch. They serve as the "failing test first → green test after" TDD discipline without the framework setup detour.

For integration paths (hooks, endpoints with DB, components), manual smoke tests defined in the spec serve as acceptance criteria. The final task group is a checklist of those smoke tests.

---

## RevenueCat anonymous-ID detail (spec deviation)

The spec recommends calling `Purchases.configure({ appUserID: '$anon:' + uuid() })` after logout to force a fresh anonymous bucket. After re-reading the RevenueCat SDK behavior: `Purchases.logOut()` **already** generates a new anonymous app-user-ID internally per RC docs. No manual fresh-ID seeding is required. The plan deviates from the spec on this point:

- **Sign-out**: `await Purchases.logOut()`, nothing else. The SDK creates the new anonymous ID.
- **Sign-in**: `await Purchases.logIn(userId)` swaps from anonymous to the authenticated user.

This deviation is captured here rather than re-litigating the spec because it's a pure implementation detail. The behavioral guarantee (a new user does not inherit the previous user's entitlements) is the same.

---

## Group A — Server: JWT auth foundation

### Task A1: Install JWT + UUID deps on the server side

**Files:**
- Modify: `package.json` (root — Vercel uses it for the functions)

- [ ] **Step 1: Install jsonwebtoken and uuid as runtime deps, types as devDeps**

```bash
npm install jsonwebtoken uuid
npm install --save-dev @types/jsonwebtoken @types/uuid
```

- [ ] **Step 2: Verify install**

```bash
node -e "require('jsonwebtoken'); require('uuid'); console.log('ok')"
```

Expected: prints `ok`.

- [ ] **Step 3: Add AUTH_JWT_SECRET to local env**

Edit `.env` (or `.env.local`) and add:

```
AUTH_JWT_SECRET=<run: openssl rand -base64 48>
```

Use `openssl rand -base64 48` (or `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` on Windows without OpenSSL) to generate the value. Note: this MUST also be added to the Vercel project environment variables before deploying.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps(server): add jsonwebtoken and uuid for session auth"
```

### Task A2: Write failing test for JWT sign/verify roundtrip

**Files:**
- Create: `scripts/test-jwt.ts`

- [ ] **Step 1: Write the failing test script**

```ts
// scripts/test-jwt.ts
// Run: npx tsx scripts/test-jwt.ts
import 'dotenv/config';
import { signSession, verifySession } from '../api/_shared/jwt';

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`FAIL: ${label}`);
    console.error(`  expected: ${JSON.stringify(expected)}`);
    console.error(`  actual:   ${JSON.stringify(actual)}`);
    process.exit(1);
  }
  console.log(`PASS: ${label}`);
}

function assertThrows(fn: () => unknown, label: string): void {
  try {
    fn();
  } catch {
    console.log(`PASS: ${label}`);
    return;
  }
  console.error(`FAIL: ${label} — did not throw`);
  process.exit(1);
}

(async () => {
  if (!process.env.AUTH_JWT_SECRET) {
    console.error('FAIL: AUTH_JWT_SECRET not set in .env');
    process.exit(1);
  }

  const payload = { sub: '550e8400-e29b-41d4-a716-446655440000', authId: 'user@example.com' };
  const token = signSession(payload);
  if (typeof token !== 'string' || token.split('.').length !== 3) {
    console.error('FAIL: signSession did not return a 3-part JWT string');
    process.exit(1);
  }
  console.log('PASS: signSession returns 3-part JWT');

  const decoded = verifySession(token);
  assertEqual(decoded.sub, payload.sub, 'verifySession returns sub');
  assertEqual(decoded.authId, payload.authId, 'verifySession returns authId');

  assertThrows(() => verifySession('not.a.token'), 'verifySession throws on garbage');
  assertThrows(() => verifySession(token + 'tamper'), 'verifySession throws on tampered token');

  console.log('All JWT tests passed.');
})();
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx tsx scripts/test-jwt.ts
```

Expected: fails with import error because `api/_shared/jwt.ts` does not yet exist.

### Task A3: Implement JWT module

**Files:**
- Create: `api/_shared/jwt.ts`

- [ ] **Step 1: Implement the module**

```ts
// api/_shared/jwt.ts
import jwt from 'jsonwebtoken';

export interface SessionPayload {
  sub: string;     // userProfiles.id (uuid)
  authId: string;  // email
}

export interface SessionPayloadDecoded extends SessionPayload {
  iat: number;
  exp: number;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const REFRESH_WINDOW_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error('AUTH_JWT_SECRET is not configured');
  }
  return secret;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, getSecret(), {
    algorithm: 'HS256',
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

export function verifySession(token: string): SessionPayloadDecoded {
  const decoded = jwt.verify(token, getSecret(), { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
    throw new Error('Invalid token payload');
  }
  const obj = decoded as Record<string, unknown>;
  if (typeof obj.sub !== 'string' || typeof obj.authId !== 'string'
      || typeof obj.iat !== 'number' || typeof obj.exp !== 'number') {
    throw new Error('Token missing required fields');
  }
  return { sub: obj.sub, authId: obj.authId, iat: obj.iat, exp: obj.exp };
}

export function shouldRefresh(decoded: SessionPayloadDecoded): boolean {
  const now = Math.floor(Date.now() / 1000);
  return decoded.exp - now < REFRESH_WINDOW_SECONDS;
}
```

- [ ] **Step 2: Re-run the test to verify pass**

```bash
npx tsx scripts/test-jwt.ts
```

Expected: all PASS lines, exit 0.

- [ ] **Step 3: Commit**

```bash
git add api/_shared/jwt.ts scripts/test-jwt.ts
git commit -m "feat(api): add JWT session sign/verify helpers"
```

### Task A4: Implement `withAuth` middleware

**Files:**
- Create: `api/_shared/withAuth.ts`

- [ ] **Step 1: Write the middleware**

```ts
// api/_shared/withAuth.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySession, signSession, shouldRefresh, type SessionPayloadDecoded } from './jwt';

export interface AuthContext {
  authId: string;
  userId: string;
  decoded: SessionPayloadDecoded;
}

export type AuthedHandler = (
  req: VercelRequest,
  res: VercelResponse,
  ctx: AuthContext,
) => Promise<void | VercelResponse> | void | VercelResponse;

export function withAuth(handler: AuthedHandler) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const authHeader = req.headers.authorization ?? '';
    const match = /^Bearer (.+)$/.exec(authHeader);
    if (!match) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = match[1];

    let decoded: SessionPayloadDecoded;
    try {
      decoded = verifySession(token);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (shouldRefresh(decoded)) {
      const refreshed = signSession({ sub: decoded.sub, authId: decoded.authId });
      res.setHeader('X-Auth-Refreshed-Token', refreshed);
    }

    return handler(req, res, {
      authId: decoded.authId,
      userId: decoded.sub,
      decoded,
    });
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add api/_shared/withAuth.ts
git commit -m "feat(api): add withAuth middleware for JWT-protected endpoints"
```

### Task A5: Extract shared `getDb` helper

**Files:**
- Create: `api/_shared/db.ts`

- [ ] **Step 1: Write the helper**

```ts
// api/_shared/db.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not configured');
  }
  const sql = neon(url);
  return drizzle(sql);
}

export type Db = ReturnType<typeof getDb>;
```

- [ ] **Step 2: Commit**

```bash
git add api/_shared/db.ts
git commit -m "refactor(api): extract shared getDb helper"
```

### Task A6: Update `/api/auth/verify` to mint a JWT

**Files:**
- Modify: `api/auth/verify.ts`

- [ ] **Step 1: Update the handler to mint and return a token**

Replace the existing return at the bottom of the success path:

```ts
// At the top of the file:
import { signSession } from '../_shared/jwt';

// Inside the handler, after `profile` is loaded:
if (!profile) {
  return res.status(500).json({ error: 'Profile lookup failed after upsert' });
}

const token = signSession({ sub: profile.id, authId: profile.authId });

return res.status(200).json({ ok: true, profile, token });
```

The rest of the file (Google token verification, welcome email logic) stays as-is.

- [ ] **Step 2: Smoke test the endpoint locally**

```bash
npx vercel dev   # or however the project runs the functions locally
```

In another terminal:

```bash
curl -X POST http://localhost:3000/api/auth/verify \
  -H 'Content-Type: application/json' \
  -d '{"provider":"email","email":"smoketest@example.com","displayName":"Smoke"}'
```

Expected: JSON response with `ok: true`, `profile: {...}`, `token: "eyJ..."`.

- [ ] **Step 3: Commit**

```bash
git add api/auth/verify.ts
git commit -m "feat(api): /auth/verify mints JWT session token"
```

### Task A7: Add `/api/auth/refresh` endpoint

**Files:**
- Create: `api/auth/refresh.ts`

- [ ] **Step 1: Write the endpoint**

```ts
// api/auth/refresh.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from '../_shared/withAuth';
import { signSession } from '../_shared/jwt';

export default withAuth(async (_req: VercelRequest, res: VercelResponse, ctx) => {
  const token = signSession({ sub: ctx.userId, authId: ctx.authId });
  return res.status(200).json({ ok: true, token });
});
```

- [ ] **Step 2: Commit**

```bash
git add api/auth/refresh.ts
git commit -m "feat(api): add /auth/refresh endpoint"
```

### Task A8: Refactor `/api/sync/profile` to use `withAuth`

**Files:**
- Modify: `api/sync/profile.ts`

- [ ] **Step 1: Wrap handler in `withAuth`, ignore body `authId`, support `preferences`**

Replace the file contents:

```ts
// api/sync/profile.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth } from '../_shared/withAuth';

interface ProfileUpsertBody {
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  preferences?: Record<string, unknown> | null;
  // Numeric fields are NOT accepted on /profile anymore.
  // Use /sync/economy with deltas instead. Prevents the legacy
  // Aviv-incident class of bug.
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  if (req.method === 'GET') {
    const db = getDb();
    const rows = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.authId, ctx.authId))
      .limit(1);
    return res.status(200).json({ ok: true, profile: rows[0] ?? null });
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as ProfileUpsertBody;
    const db = getDb();

    const setFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.displayName !== undefined && body.displayName !== null) setFields.displayName = body.displayName;
    if (body.email !== undefined && body.email !== null) setFields.email = body.email;
    if (body.avatarUrl !== undefined && body.avatarUrl !== null) setFields.avatarUrl = body.avatarUrl;
    if (body.preferences !== undefined && body.preferences !== null) setFields.preferences = body.preferences;

    await db
      .update(userProfiles)
      .set(setFields)
      .where(eq(userProfiles.authId, ctx.authId));

    const rows = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.authId, ctx.authId))
      .limit(1);
    return res.status(200).json({ ok: true, profile: rows[0] ?? null });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
```

Note: We removed numeric field acceptance entirely. Those move to `/sync/economy` (Task B1). The historical Aviv incident in the old comment is structurally prevented now — there is no path on `/sync/profile` to overwrite XP/coins.

Also note: the `preferences` column does not yet exist in the schema; Task A9 adds it. This file references the column via Drizzle, so it will type-error until Task A9 completes. Sequence A9 before A10's deploy.

- [ ] **Step 2: Commit (will not run cleanly until A9 ships)**

```bash
git add api/sync/profile.ts
git commit -m "refactor(api): /sync/profile uses withAuth, drops numeric writes, accepts preferences"
```

### Task A9: Add `preferences` JSONB column

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/db/migrations/0001_add_preferences.sql`

- [ ] **Step 1: Update the Drizzle schema**

In `src/db/schema.ts`, add `preferences` to the `userProfiles` definition. Insert this line right after the `syncToken: text("sync_token"),` line:

```ts
preferences: jsonb("preferences"),
```

Ensure `jsonb` is in the import at the top of the file (it already is).

- [ ] **Step 2: Generate the migration with drizzle-kit**

```bash
npx drizzle-kit generate --name add_preferences
```

This produces a SQL file in `src/db/migrations/` (the path drizzle.config.ts points to). If the generated file is missing or in an unexpected location, manually create `src/db/migrations/0001_add_preferences.sql`:

```sql
ALTER TABLE "user_profiles" ADD COLUMN "preferences" jsonb;
```

- [ ] **Step 3: Apply the migration to Neon**

```bash
# Use whatever the project's standard migration runner is.
# If using drizzle-kit:
npx drizzle-kit push
# OR run the SQL directly via the Neon console.
```

- [ ] **Step 4: Verify the column exists**

```bash
# Via Neon console or psql:
# SELECT column_name FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='preferences';
```

Expected: one row returned.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts src/db/migrations/
git commit -m "feat(db): add user_profiles.preferences jsonb column"
```

### Task A10: Refactor `/api/sync/progress` to use `withAuth`

**Files:**
- Modify: `api/sync/progress.ts`

- [ ] **Step 1: Wrap in withAuth, derive userId from token**

Replace file contents:

```ts
// api/sync/progress.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { moduleProgress, userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth, type AuthContext } from '../_shared/withAuth';
import type { Db } from '../_shared/db';

interface ProgressUpsertBody {
  moduleId: string;
  moduleName?: string;
  status?: string;
  quizScore?: number;
  quizAttempts?: number;
  bestScore?: number;
  xpEarned?: number;
}

async function resolveUserId(db: Db, ctx: AuthContext): Promise<string | null> {
  // Prefer the userId from the token. Fall back to authId lookup for safety.
  if (ctx.userId) return ctx.userId;
  const rows = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.authId, ctx.authId))
    .limit(1);
  return rows[0]?.id ?? null;
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  const db = getDb();
  const userId = await resolveUserId(db, ctx);
  if (!userId) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (req.method === 'GET') {
    const rows = await db
      .select()
      .from(moduleProgress)
      .where(eq(moduleProgress.userId, userId));
    return res.status(200).json({ ok: true, progress: rows });
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as ProgressUpsertBody;
    if (!body.moduleId) {
      return res.status(400).json({ error: 'Missing moduleId' });
    }
    const status = body.status ?? 'completed';
    const completedAt = status === 'completed' ? new Date().toISOString() : undefined;

    await db
      .insert(moduleProgress)
      .values({
        userId,
        moduleId: body.moduleId,
        moduleName: body.moduleName ?? undefined,
        status,
        quizScore: body.quizScore,
        quizAttempts: body.quizAttempts,
        bestScore: body.bestScore,
        xpEarned: body.xpEarned,
        completedAt,
      })
      .onConflictDoUpdate({
        target: [moduleProgress.userId, moduleProgress.moduleId],
        set: {
          moduleName: body.moduleName ?? undefined,
          status,
          quizScore: body.quizScore,
          quizAttempts: body.quizAttempts,
          bestScore: body.bestScore,
          xpEarned: body.xpEarned,
          completedAt,
          updatedAt: new Date().toISOString(),
        },
      });

    const rows = await db
      .select()
      .from(moduleProgress)
      .where(eq(moduleProgress.userId, userId));
    return res.status(200).json({ ok: true, progress: rows });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
```

- [ ] **Step 2: Commit**

```bash
git add api/sync/progress.ts
git commit -m "refactor(api): /sync/progress uses withAuth"
```

---

## Group B — Server: data endpoints

### Task B1: Add `/api/sync/economy` (delta mutations)

**Files:**
- Create: `api/sync/economy.ts`

- [ ] **Step 1: Implement the endpoint**

```ts
// api/sync/economy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq, sql } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth } from '../_shared/withAuth';

interface EconomyDeltaBody {
  xpDelta?: number;
  coinsDelta?: number;
  gemsDelta?: number;
  virtualBalanceSet?: number; // Trading sets absolute. Not a delta.
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  const db = getDb();

  if (req.method === 'GET') {
    const rows = await db
      .select({
        xp: userProfiles.xp,
        coins: userProfiles.coins,
        gems: userProfiles.gems,
        level: userProfiles.level,
        virtualBalance: userProfiles.virtualBalance,
      })
      .from(userProfiles)
      .where(eq(userProfiles.authId, ctx.authId))
      .limit(1);
    return res.status(200).json({ ok: true, economy: rows[0] ?? null });
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as EconomyDeltaBody;

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof body.xpDelta === 'number' && body.xpDelta !== 0) {
      updates.xp = sql`COALESCE(${userProfiles.xp}, 0) + ${body.xpDelta}`;
    }
    if (typeof body.coinsDelta === 'number' && body.coinsDelta !== 0) {
      updates.coins = sql`COALESCE(${userProfiles.coins}, 0) + ${body.coinsDelta}`;
    }
    if (typeof body.gemsDelta === 'number' && body.gemsDelta !== 0) {
      updates.gems = sql`COALESCE(${userProfiles.gems}, 0) + ${body.gemsDelta}`;
    }
    if (typeof body.virtualBalanceSet === 'number' && Number.isFinite(body.virtualBalanceSet)) {
      updates.virtualBalance = body.virtualBalanceSet.toString();
    }

    if (Object.keys(updates).length === 1) {
      // Only updatedAt — nothing to do.
      return res.status(400).json({ error: 'No deltas provided' });
    }

    await db
      .update(userProfiles)
      .set(updates)
      .where(eq(userProfiles.authId, ctx.authId));

    const rows = await db
      .select({
        xp: userProfiles.xp,
        coins: userProfiles.coins,
        gems: userProfiles.gems,
        level: userProfiles.level,
        virtualBalance: userProfiles.virtualBalance,
      })
      .from(userProfiles)
      .where(eq(userProfiles.authId, ctx.authId))
      .limit(1);
    return res.status(200).json({ ok: true, economy: rows[0] ?? null });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
```

- [ ] **Step 2: Commit**

```bash
git add api/sync/economy.ts
git commit -m "feat(api): add /sync/economy with delta mutations and absolute virtualBalance set"
```

### Task B2: Add `/api/sync/subscription`

**Files:**
- Create: `api/sync/subscription.ts`

- [ ] **Step 1: Implement the endpoint**

```ts
// api/sync/subscription.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth } from '../_shared/withAuth';

interface SubscriptionSyncBody {
  isPro: boolean;
  proExpiresAt?: string | null; // ISO string
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  const db = getDb();

  if (req.method === 'GET') {
    const rows = await db
      .select({
        isPro: userProfiles.isPro,
        proExpiresAt: userProfiles.proExpiresAt,
      })
      .from(userProfiles)
      .where(eq(userProfiles.authId, ctx.authId))
      .limit(1);
    return res.status(200).json({ ok: true, subscription: rows[0] ?? null });
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as SubscriptionSyncBody;
    if (typeof body.isPro !== 'boolean') {
      return res.status(400).json({ error: 'Missing isPro boolean' });
    }
    await db
      .update(userProfiles)
      .set({
        isPro: body.isPro,
        proExpiresAt: body.proExpiresAt ?? null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userProfiles.authId, ctx.authId));

    const rows = await db
      .select({
        isPro: userProfiles.isPro,
        proExpiresAt: userProfiles.proExpiresAt,
      })
      .from(userProfiles)
      .where(eq(userProfiles.authId, ctx.authId))
      .limit(1);
    return res.status(200).json({ ok: true, subscription: rows[0] ?? null });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
```

- [ ] **Step 2: Commit**

```bash
git add api/sync/subscription.ts
git commit -m "feat(api): add /sync/subscription for client-side RC reconciliation"
```

### Task B3: Add `/api/sync/streak`

**Files:**
- Create: `api/sync/streak.ts`

- [ ] **Step 1: Implement the endpoint**

```ts
// api/sync/streak.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth } from '../_shared/withAuth';

interface StreakActivityBody {
  dateIl: string; // YYYY-MM-DD in Israel timezone, computed client-side
}

function diffDays(later: string, earlier: string): number {
  const a = new Date(later + 'T00:00:00Z').getTime();
  const b = new Date(earlier + 'T00:00:00Z').getTime();
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  const db = getDb();

  if (req.method === 'GET') {
    const rows = await db
      .select({
        currentStreak: userProfiles.currentStreak,
        longestStreak: userProfiles.longestStreak,
        lastActiveDate: userProfiles.lastActiveDate,
      })
      .from(userProfiles)
      .where(eq(userProfiles.authId, ctx.authId))
      .limit(1);
    return res.status(200).json({ ok: true, streak: rows[0] ?? null });
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as StreakActivityBody;
    if (!body.dateIl || !/^\d{4}-\d{2}-\d{2}$/.test(body.dateIl)) {
      return res.status(400).json({ error: 'Invalid dateIl (expected YYYY-MM-DD)' });
    }

    const rows = await db
      .select({
        currentStreak: userProfiles.currentStreak,
        longestStreak: userProfiles.longestStreak,
        lastActiveDate: userProfiles.lastActiveDate,
      })
      .from(userProfiles)
      .where(eq(userProfiles.authId, ctx.authId))
      .limit(1);

    const cur = rows[0];
    let newCurrent = cur?.currentStreak ?? 0;
    let newLongest = cur?.longestStreak ?? 0;
    const last = cur?.lastActiveDate ?? null;

    if (last === body.dateIl) {
      // Idempotent: already counted today.
    } else if (!last) {
      newCurrent = 1;
    } else {
      const diff = diffDays(body.dateIl, last);
      if (diff === 1) newCurrent = (cur?.currentStreak ?? 0) + 1;
      else if (diff > 1) newCurrent = 1;
      // diff <= 0 means client clock skew — leave streak unchanged.
    }

    if (newCurrent > newLongest) newLongest = newCurrent;

    await db
      .update(userProfiles)
      .set({
        currentStreak: newCurrent,
        longestStreak: newLongest,
        lastActiveDate: body.dateIl,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userProfiles.authId, ctx.authId));

    return res.status(200).json({
      ok: true,
      streak: {
        currentStreak: newCurrent,
        longestStreak: newLongest,
        lastActiveDate: body.dateIl,
      },
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
```

- [ ] **Step 2: Commit**

```bash
git add api/sync/streak.ts
git commit -m "feat(api): add /sync/streak with idempotent recordDailyActivity"
```

### Task B4: Add `/api/sync/user-stats`

**Files:**
- Create: `src/db/migrations/0002_add_user_stats.sql`
- Modify: `src/db/schema.ts`
- Create: `api/sync/user-stats.ts`

- [ ] **Step 1: Add the `user_stats` table to the schema**

In `src/db/schema.ts`, add at the bottom (above the export list if any):

```ts
export const userStats = pgTable("user_stats", {
  userId: uuid("user_id").primaryKey().notNull(),
  totalSessionSeconds: integer("total_session_seconds").default(0).notNull(),
  moduleDurations: jsonb("module_durations").default(sql`'{}'::jsonb`),  // { [moduleId: string]: seconds }
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [userProfiles.id],
    name: "user_stats_user_id_fkey"
  }).onDelete("cascade"),
]);
```

- [ ] **Step 2: Generate + apply the migration**

```bash
npx drizzle-kit generate --name add_user_stats
npx drizzle-kit push   # or apply manually via Neon console
```

If generation produces nothing, create the SQL manually at `src/db/migrations/0002_add_user_stats.sql`:

```sql
CREATE TABLE "user_stats" (
  "user_id" uuid PRIMARY KEY,
  "total_session_seconds" integer NOT NULL DEFAULT 0,
  "module_durations" jsonb DEFAULT '{}'::jsonb,
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "user_stats_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE
);
```

- [ ] **Step 3: Implement the endpoint**

```ts
// api/sync/user-stats.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq, sql } from 'drizzle-orm';
import { userStats } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth } from '../_shared/withAuth';

interface UserStatsBody {
  sessionSecondsDelta?: number;
  moduleId?: string;
  moduleSecondsDelta?: number;
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  const db = getDb();

  if (req.method === 'GET') {
    const rows = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, ctx.userId))
      .limit(1);
    return res.status(200).json({ ok: true, userStats: rows[0] ?? null });
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as UserStatsBody;

    // Ensure row exists.
    await db
      .insert(userStats)
      .values({ userId: ctx.userId })
      .onConflictDoNothing();

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof body.sessionSecondsDelta === 'number' && body.sessionSecondsDelta > 0) {
      updates.totalSessionSeconds = sql`${userStats.totalSessionSeconds} + ${body.sessionSecondsDelta}`;
    }
    if (typeof body.moduleSecondsDelta === 'number' && body.moduleSecondsDelta > 0 && body.moduleId) {
      // jsonb merge: bump the specific module's seconds.
      updates.moduleDurations = sql`COALESCE(${userStats.moduleDurations}, '{}'::jsonb) || jsonb_build_object(${body.moduleId}::text, (COALESCE((${userStats.moduleDurations}->>${body.moduleId})::int, 0) + ${body.moduleSecondsDelta}))`;
    }

    if (Object.keys(updates).length > 1) {
      await db
        .update(userStats)
        .set(updates)
        .where(eq(userStats.userId, ctx.userId));
    }

    const rows = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, ctx.userId))
      .limit(1);
    return res.status(200).json({ ok: true, userStats: rows[0] ?? null });
  }

  return res.status(405).json({ error: 'Method not allowed' });
});
```

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts src/db/migrations/ api/sync/user-stats.ts
git commit -m "feat(api,db): add user_stats table and /sync/user-stats endpoint"
```

---

## Group C — Server: backfill endpoint

### Task C1: Write failing test for backfill merge logic

**Files:**
- Create: `scripts/test-backfill-merge.ts`
- Create: `api/_shared/backfillMerge.ts` (empty stub)

- [ ] **Step 1: Create the empty module so the import resolves**

`api/_shared/backfillMerge.ts`:

```ts
// Stub — implementation in Task C2.
export interface ServerProfile {
  xp: number; coins: number; gems: number;
  currentStreak: number; longestStreak: number;
  virtualBalance: string; // numeric → string from pg
  isPro: boolean;
  preferences: Record<string, unknown> | null;
}
export interface LocalProfile {
  xp?: number; coins?: number; gems?: number;
  currentStreak?: number; longestStreak?: number;
  virtualBalance?: number;
  isPro?: boolean;
  preferences?: Record<string, unknown> | null;
}
export interface ServerModuleProgress {
  moduleId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  bestScore: number;
  xpEarned: number;
}
export interface LocalModuleProgress {
  moduleId: string;
  status?: 'not_started' | 'in_progress' | 'completed';
  bestScore?: number;
  xpEarned?: number;
  moduleName?: string;
}
export function mergeProfile(_server: ServerProfile, _local: LocalProfile): ServerProfile {
  throw new Error('not implemented');
}
export function mergeModule(_server: ServerModuleProgress | undefined, _local: LocalModuleProgress): ServerModuleProgress {
  throw new Error('not implemented');
}
```

- [ ] **Step 2: Write the failing test script**

`scripts/test-backfill-merge.ts`:

```ts
// scripts/test-backfill-merge.ts
// Run: npx tsx scripts/test-backfill-merge.ts
import { mergeProfile, mergeModule } from '../api/_shared/backfillMerge';
import type { ServerProfile, LocalProfile, ServerModuleProgress, LocalModuleProgress } from '../api/_shared/backfillMerge';

let failed = 0;
function check(cond: boolean, label: string): void {
  if (cond) console.log(`PASS: ${label}`);
  else { console.error(`FAIL: ${label}`); failed++; }
}

const baseServer: ServerProfile = {
  xp: 1000, coins: 500, gems: 10,
  currentStreak: 3, longestStreak: 7,
  virtualBalance: '100000', isPro: false,
  preferences: null,
};

// Numeric merge takes MAX, never decreases.
{
  const local: LocalProfile = { xp: 500, coins: 600 };
  const merged = mergeProfile(baseServer, local);
  check(merged.xp === 1000, 'xp never decreases below server');
  check(merged.coins === 600, 'coins takes MAX of local/server');
  check(merged.gems === 10, 'gems unchanged when no local value');
}

// virtualBalance MAX.
{
  const local: LocalProfile = { virtualBalance: 150000 };
  const merged = mergeProfile(baseServer, local);
  check(merged.virtualBalance === '150000', 'virtualBalance takes MAX (as string)');
}

// virtualBalance: local lower → server kept.
{
  const local: LocalProfile = { virtualBalance: 50000 };
  const merged = mergeProfile(baseServer, local);
  check(merged.virtualBalance === '100000', 'virtualBalance: server kept if higher');
}

// isPro: true wins (never downgrade in backfill).
{
  const local: LocalProfile = { isPro: true };
  const merged = mergeProfile(baseServer, local);
  check(merged.isPro === true, 'isPro: local true upgrades server');
}
{
  const serverPro: ServerProfile = { ...baseServer, isPro: true };
  const local: LocalProfile = { isPro: false };
  const merged = mergeProfile(serverPro, local);
  check(merged.isPro === true, 'isPro: server true never downgraded by local false');
}

// preferences: only set if server null.
{
  const local: LocalProfile = { preferences: { companionId: 'warren-buffett' } };
  const merged = mergeProfile(baseServer, local);
  check(JSON.stringify(merged.preferences) === '{"companionId":"warren-buffett"}', 'preferences set when server null');
}
{
  const serverWithPrefs: ServerProfile = { ...baseServer, preferences: { companionId: 'graham' } };
  const local: LocalProfile = { preferences: { companionId: 'buffett' } };
  const merged = mergeProfile(serverWithPrefs, local);
  check((merged.preferences as { companionId: string }).companionId === 'graham', 'preferences: server kept when present');
}

// Module: status completed > in_progress > not_started.
{
  const local: LocalModuleProgress = { moduleId: 'm1', status: 'completed', bestScore: 80, xpEarned: 50 };
  const merged = mergeModule(undefined, local);
  check(merged.status === 'completed', 'module: local-only completed → completed');
  check(merged.bestScore === 80, 'module: local-only bestScore preserved');
}
{
  const server: ServerModuleProgress = { moduleId: 'm1', status: 'completed', bestScore: 95, xpEarned: 60 };
  const local: LocalModuleProgress = { moduleId: 'm1', status: 'in_progress', bestScore: 70, xpEarned: 30 };
  const merged = mergeModule(server, local);
  check(merged.status === 'completed', 'module: server completed never regresses');
  check(merged.bestScore === 95, 'module: bestScore MAX (server higher)');
  check(merged.xpEarned === 60, 'module: xpEarned MAX (server higher)');
}
{
  const server: ServerModuleProgress = { moduleId: 'm1', status: 'in_progress', bestScore: 50, xpEarned: 10 };
  const local: LocalModuleProgress = { moduleId: 'm1', status: 'completed', bestScore: 80, xpEarned: 50 };
  const merged = mergeModule(server, local);
  check(merged.status === 'completed', 'module: local completed promotes from server in_progress');
  check(merged.bestScore === 80, 'module: bestScore MAX (local higher)');
  check(merged.xpEarned === 50, 'module: xpEarned MAX (local higher)');
}

if (failed > 0) {
  console.error(`${failed} tests failed.`);
  process.exit(1);
}
console.log('All backfill-merge tests passed.');
```

- [ ] **Step 3: Run to verify it fails**

```bash
npx tsx scripts/test-backfill-merge.ts
```

Expected: throws "not implemented" on the first call.

### Task C2: Implement backfill merge logic

**Files:**
- Modify: `api/_shared/backfillMerge.ts`

- [ ] **Step 1: Replace stub with real implementation**

```ts
// api/_shared/backfillMerge.ts
export interface ServerProfile {
  xp: number; coins: number; gems: number;
  currentStreak: number; longestStreak: number;
  virtualBalance: string;
  isPro: boolean;
  preferences: Record<string, unknown> | null;
}
export interface LocalProfile {
  xp?: number; coins?: number; gems?: number;
  currentStreak?: number; longestStreak?: number;
  virtualBalance?: number;
  isPro?: boolean;
  preferences?: Record<string, unknown> | null;
}
export interface ServerModuleProgress {
  moduleId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  bestScore: number;
  xpEarned: number;
}
export interface LocalModuleProgress {
  moduleId: string;
  status?: 'not_started' | 'in_progress' | 'completed';
  bestScore?: number;
  xpEarned?: number;
  moduleName?: string;
}

function maxNum(a: number | undefined, b: number | undefined): number {
  const av = typeof a === 'number' ? a : 0;
  const bv = typeof b === 'number' ? b : 0;
  return Math.max(av, bv);
}

export function mergeProfile(server: ServerProfile, local: LocalProfile): ServerProfile {
  const out: ServerProfile = { ...server };

  out.xp = maxNum(server.xp, local.xp);
  out.coins = maxNum(server.coins, local.coins);
  out.gems = maxNum(server.gems, local.gems);
  out.currentStreak = maxNum(server.currentStreak, local.currentStreak);
  out.longestStreak = maxNum(server.longestStreak, local.longestStreak);

  // virtualBalance: numeric stored as string.
  const serverVb = parseFloat(server.virtualBalance);
  const localVb = typeof local.virtualBalance === 'number' ? local.virtualBalance : -Infinity;
  out.virtualBalance = (Math.max(serverVb, localVb)).toString();

  // isPro: true never downgrades.
  out.isPro = server.isPro || local.isPro === true;

  // preferences: only set if server null.
  if (server.preferences === null && local.preferences !== undefined && local.preferences !== null) {
    out.preferences = local.preferences;
  }

  return out;
}

const STATUS_RANK: Record<ServerModuleProgress['status'], number> = {
  not_started: 0,
  in_progress: 1,
  completed: 2,
};

export function mergeModule(
  server: ServerModuleProgress | undefined,
  local: LocalModuleProgress,
): ServerModuleProgress {
  const localStatus = local.status ?? 'not_started';
  if (!server) {
    return {
      moduleId: local.moduleId,
      status: localStatus,
      bestScore: local.bestScore ?? 0,
      xpEarned: local.xpEarned ?? 0,
    };
  }
  const status = STATUS_RANK[localStatus] > STATUS_RANK[server.status] ? localStatus : server.status;
  return {
    moduleId: server.moduleId,
    status,
    bestScore: maxNum(server.bestScore, local.bestScore),
    xpEarned: maxNum(server.xpEarned, local.xpEarned),
  };
}
```

- [ ] **Step 2: Re-run the test to verify pass**

```bash
npx tsx scripts/test-backfill-merge.ts
```

Expected: all PASS, exit 0.

- [ ] **Step 3: Commit**

```bash
git add api/_shared/backfillMerge.ts scripts/test-backfill-merge.ts
git commit -m "feat(api): backfill merge logic with TDD coverage"
```

### Task C3: Add `/api/migrate/backfill-v1` endpoint

**Files:**
- Create: `api/migrate/backfill-v1.ts`

- [ ] **Step 1: Implement the endpoint**

```ts
// api/migrate/backfill-v1.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { moduleProgress, userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth } from '../_shared/withAuth';
import { mergeProfile, mergeModule, type LocalProfile, type LocalModuleProgress, type ServerProfile, type ServerModuleProgress } from '../_shared/backfillMerge';

interface BackfillBody {
  profile?: LocalProfile;
  modules?: LocalModuleProgress[];
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (process.env.BACKFILL_V1_ENABLED === 'false') {
    return res.status(503).json({ error: 'Backfill temporarily disabled' });
  }

  const body = (req.body ?? {}) as BackfillBody;
  const db = getDb();

  // Read current server profile.
  const profileRows = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.authId, ctx.authId))
    .limit(1);
  const profileRow = profileRows[0];
  if (!profileRow) {
    return res.status(404).json({ error: 'User profile not found' });
  }

  const serverProfile: ServerProfile = {
    xp: profileRow.xp ?? 0,
    coins: profileRow.coins ?? 0,
    gems: profileRow.gems ?? 0,
    currentStreak: profileRow.currentStreak ?? 0,
    longestStreak: profileRow.longestStreak ?? 0,
    virtualBalance: profileRow.virtualBalance ?? '0',
    isPro: profileRow.isPro ?? false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    preferences: (profileRow as any).preferences ?? null,
  };

  const mergedProfile = mergeProfile(serverProfile, body.profile ?? {});

  await db
    .update(userProfiles)
    .set({
      xp: mergedProfile.xp,
      coins: mergedProfile.coins,
      gems: mergedProfile.gems,
      currentStreak: mergedProfile.currentStreak,
      longestStreak: mergedProfile.longestStreak,
      virtualBalance: mergedProfile.virtualBalance,
      isPro: mergedProfile.isPro,
      preferences: mergedProfile.preferences ?? undefined,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(userProfiles.authId, ctx.authId));

  // Modules.
  if (Array.isArray(body.modules) && body.modules.length > 0) {
    const userId = profileRow.id;
    const existing = await db
      .select()
      .from(moduleProgress)
      .where(eq(moduleProgress.userId, userId));

    const byId = new Map<string, ServerModuleProgress>();
    for (const m of existing) {
      byId.set(m.moduleId, {
        moduleId: m.moduleId,
        status: (m.status as ServerModuleProgress['status']) ?? 'not_started',
        bestScore: m.bestScore ?? 0,
        xpEarned: m.xpEarned ?? 0,
      });
    }

    for (const local of body.modules) {
      if (!local.moduleId) continue;
      const merged = mergeModule(byId.get(local.moduleId), local);
      const completedAt = merged.status === 'completed' ? new Date().toISOString() : null;

      await db
        .insert(moduleProgress)
        .values({
          userId,
          moduleId: merged.moduleId,
          moduleName: local.moduleName ?? undefined,
          status: merged.status,
          bestScore: merged.bestScore,
          xpEarned: merged.xpEarned,
          completedAt: completedAt ?? undefined,
        })
        .onConflictDoUpdate({
          target: [moduleProgress.userId, moduleProgress.moduleId],
          set: {
            status: merged.status,
            bestScore: merged.bestScore,
            xpEarned: merged.xpEarned,
            completedAt: completedAt ?? undefined,
            updatedAt: new Date().toISOString(),
          },
        });
    }
  }

  // Return the new canonical state so the client can pre-warm caches.
  const finalProfile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.authId, ctx.authId))
    .limit(1);
  const finalProgress = await db
    .select()
    .from(moduleProgress)
    .where(eq(moduleProgress.userId, profileRow.id));

  return res.status(200).json({
    ok: true,
    profile: finalProfile[0] ?? null,
    progress: finalProgress,
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add api/migrate/backfill-v1.ts
git commit -m "feat(api): /migrate/backfill-v1 with MAX-merge and idempotent semantics"
```

---

## Group D — Client: dependencies + provider

### Task D1: Install client deps

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

```bash
npm install @tanstack/react-query expo-secure-store uuid
npm install --save-dev @types/uuid tsx
```

Note: `tsx` is installed for the test scripts. `expo-secure-store` may already be present; the command is a no-op if so.

- [ ] **Step 2: Verify install**

```bash
node -e "require('@tanstack/react-query'); require('uuid'); console.log('ok')"
```

Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add react-query, expo-secure-store, uuid for new persistence layer"
```

### Task D2: Set up QueryClient

**Files:**
- Create: `src/lib/queryClient.ts`

- [ ] **Step 1: Implement**

```ts
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Per-resource overrides set on individual useQuery calls.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 2,
        refetchOnWindowFocus: false, // RN doesn't have window focus; we use AppState.
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}

// Singleton — created once at module load, shared across the app.
export const queryClient = createQueryClient();
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/queryClient.ts
git commit -m "feat(client): add QueryClient factory and singleton"
```

### Task D3: Wrap the app with QueryClientProvider

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Add the provider and remove the legacy RC effect**

Open `app/_layout.tsx`. At the top:

```ts
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/queryClient';
```

Wrap the root return in the provider. The exact wrapping depends on the current structure; locate the existing return and wrap the outermost component:

```tsx
return (
  <QueryClientProvider client={queryClient}>
    {/* existing tree */}
  </QueryClientProvider>
);
```

In the same file, locate lines 235–246 (the RC configure + userEmail effect). Delete that block entirely. RC initialization moves into `lifecycle.ts` (Task G2).

- [ ] **Step 2: Run the app to verify it still renders**

```bash
npx expo start
```

Expected: app boots, no provider-related errors. (You'll see runtime errors elsewhere because of the upcoming refactor; just verify QueryClientProvider doesn't crash on its own.)

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(client): wrap app in QueryClientProvider; remove legacy RC effect"
```

---

## Group E — Client: secure store, registry, API client

### Task E1: SecureStore wrapper

**Files:**
- Create: `src/lib/auth/secureStore.ts`

- [ ] **Step 1: Implement**

```ts
// src/lib/auth/secureStore.ts
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'finplay_auth_token';
const BACKFILL_FLAG_KEY = 'finplay_backfill_v1_done';

// Web fallback: SecureStore doesn't exist on web. Use localStorage instead.
// Token leakage on web is a separate concern out of scope for P0.
async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}
async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  return SecureStore.getItemAsync(key);
}
async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStore = {
  get: () => getItem(TOKEN_KEY),
  set: (value: string) => setItem(TOKEN_KEY, value),
  clear: () => deleteItem(TOKEN_KEY),
};

export const backfillFlag = {
  isDone: async () => (await getItem(BACKFILL_FLAG_KEY)) === '1',
  markDone: () => setItem(BACKFILL_FLAG_KEY, '1'),
  reset: () => deleteItem(BACKFILL_FLAG_KEY),
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/auth/secureStore.ts
git commit -m "feat(client): secure-store wrapper for JWT and backfill flag"
```

### Task E2: Local store registry

**Files:**
- Create: `src/lib/stores/registry.ts`

- [ ] **Step 1: Implement**

```ts
// src/lib/stores/registry.ts
interface ResettableStore {
  getState(): { reset: () => void };
}

interface LocalStoreRef {
  storageKey: string | null;
  reset: () => void;
}

const registry = new Map<string, LocalStoreRef>();

export function registerLocalStore(
  name: string,
  store: ResettableStore,
  storageKey: string | null,
): void {
  registry.set(name, {
    storageKey,
    reset: () => store.getState().reset(),
  });
}

export function resetAllLocalStores(): void {
  for (const ref of registry.values()) {
    try { ref.reset(); }
    catch { /* swallow — one store failing should not block sign-out */ }
  }
}

export function getLocalStorageKeys(): string[] {
  return Array.from(registry.values())
    .map((r) => r.storageKey)
    .filter((k): k is string => k !== null);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/stores/registry.ts
git commit -m "feat(client): local store registry with reset and storage-key tracking"
```

### Task E3: API client

**Files:**
- Create: `src/lib/api/client.ts`

- [ ] **Step 1: Implement**

```ts
// src/lib/api/client.ts
import { tokenStore } from '../auth/secureStore';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? '';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
  }
}

let onUnauthorizedHandler: (() => void) | null = null;
export function setOnUnauthorized(handler: () => void): void {
  onUnauthorizedHandler = handler;
}

async function request<TBody, TResponse>(
  method: 'GET' | 'POST',
  path: string,
  body?: TBody,
): Promise<TResponse> {
  const token = await tokenStore.get();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = API_BASE ? `${API_BASE}${path}` : path;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Token rotation.
  const refreshed = res.headers.get('X-Auth-Refreshed-Token');
  if (refreshed) {
    await tokenStore.set(refreshed);
  }

  if (res.status === 401) {
    if (onUnauthorizedHandler) onUnauthorizedHandler();
    throw new ApiError('Unauthorized', 401, null);
  }

  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(parsed?.error ?? `HTTP ${res.status}`, res.status, parsed);
  }
  return parsed as TResponse;
}

export const api = {
  get: <TResponse>(path: string) => request<undefined, TResponse>('GET', path),
  post: <TBody, TResponse>(path: string, body: TBody) =>
    request<TBody, TResponse>('POST', path, body),
};
```

Note: `EXPO_PUBLIC_API_BASE` is empty for local dev (uses relative paths via Vercel dev) and points at the deployed URL for production builds. Add it to your `.env` if not present.

- [ ] **Step 2: Commit**

```bash
git add src/lib/api/client.ts
git commit -m "feat(client): typed API client with JWT + 401 + token rotation"
```

### Task E4: Per-resource API modules

**Files:**
- Create: `src/lib/api/profile.ts`
- Create: `src/lib/api/economy.ts`
- Create: `src/lib/api/subscription.ts`
- Create: `src/lib/api/streak.ts`
- Create: `src/lib/api/progress.ts`
- Create: `src/lib/api/userStats.ts`
- Create: `src/lib/api/migrate.ts`

- [ ] **Step 1: Implement profile module**

```ts
// src/lib/api/profile.ts
import { api } from './client';

export interface ProfileRow {
  id: string; authId: string;
  displayName: string | null; email: string | null; avatarUrl: string | null;
  level: number | null; xp: number | null; coins: number | null; gems: number | null;
  currentStreak: number | null; longestStreak: number | null;
  lastActiveDate: string | null;
  isPro: boolean | null; proExpiresAt: string | null;
  virtualBalance: string;
  preferences: Record<string, unknown> | null;
  createdAt: string | null; updatedAt: string | null;
}

export function getProfile() {
  return api.get<{ ok: true; profile: ProfileRow | null }>('/api/sync/profile');
}

export function updateProfile(patch: Partial<Pick<ProfileRow, 'displayName' | 'avatarUrl' | 'preferences'>>) {
  return api.post<typeof patch, { ok: true; profile: ProfileRow | null }>('/api/sync/profile', patch);
}
```

- [ ] **Step 2: Implement economy module**

```ts
// src/lib/api/economy.ts
import { api } from './client';

export interface Economy {
  xp: number | null;
  coins: number | null;
  gems: number | null;
  level: number | null;
  virtualBalance: string;
}

export function getEconomy() {
  return api.get<{ ok: true; economy: Economy | null }>('/api/sync/economy');
}

export function applyEconomyDelta(payload: {
  xpDelta?: number; coinsDelta?: number; gemsDelta?: number; virtualBalanceSet?: number;
}) {
  return api.post<typeof payload, { ok: true; economy: Economy | null }>('/api/sync/economy', payload);
}
```

- [ ] **Step 3: Implement subscription module**

```ts
// src/lib/api/subscription.ts
import { api } from './client';

export interface SubscriptionState {
  isPro: boolean | null;
  proExpiresAt: string | null;
}

export function getSubscription() {
  return api.get<{ ok: true; subscription: SubscriptionState | null }>('/api/sync/subscription');
}

export function syncSubscription(payload: { isPro: boolean; proExpiresAt?: string | null }) {
  return api.post<typeof payload, { ok: true; subscription: SubscriptionState | null }>('/api/sync/subscription', payload);
}
```

- [ ] **Step 4: Implement streak module**

```ts
// src/lib/api/streak.ts
import { api } from './client';

export interface StreakState {
  currentStreak: number | null;
  longestStreak: number | null;
  lastActiveDate: string | null;
}

export function getStreak() {
  return api.get<{ ok: true; streak: StreakState | null }>('/api/sync/streak');
}

export function recordDailyActivity(dateIl: string) {
  return api.post<{ dateIl: string }, { ok: true; streak: StreakState }>('/api/sync/streak', { dateIl });
}
```

- [ ] **Step 5: Implement progress module**

```ts
// src/lib/api/progress.ts
import { api } from './client';

export interface ModuleProgressRow {
  moduleId: string;
  moduleName: string | null;
  status: 'not_started' | 'in_progress' | 'completed';
  quizScore: number | null;
  quizAttempts: number | null;
  bestScore: number | null;
  xpEarned: number | null;
  completedAt: string | null;
}

export function getProgress() {
  return api.get<{ ok: true; progress: ModuleProgressRow[] }>('/api/sync/progress');
}

export function upsertModuleProgress(payload: {
  moduleId: string; moduleName?: string;
  status?: 'not_started' | 'in_progress' | 'completed';
  quizScore?: number; quizAttempts?: number; bestScore?: number; xpEarned?: number;
}) {
  return api.post<typeof payload, { ok: true; progress: ModuleProgressRow[] }>('/api/sync/progress', payload);
}
```

- [ ] **Step 6: Implement userStats module**

```ts
// src/lib/api/userStats.ts
import { api } from './client';

export interface UserStatsRow {
  userId: string;
  totalSessionSeconds: number;
  moduleDurations: Record<string, number> | null;
  updatedAt: string | null;
}

export function getUserStats() {
  return api.get<{ ok: true; userStats: UserStatsRow | null }>('/api/sync/user-stats');
}

export function recordSessionTime(seconds: number) {
  return api.post<{ sessionSecondsDelta: number }, { ok: true; userStats: UserStatsRow | null }>(
    '/api/sync/user-stats',
    { sessionSecondsDelta: seconds },
  );
}

export function recordModuleDuration(moduleId: string, seconds: number) {
  return api.post<
    { moduleId: string; moduleSecondsDelta: number },
    { ok: true; userStats: UserStatsRow | null }
  >('/api/sync/user-stats', { moduleId, moduleSecondsDelta: seconds });
}
```

- [ ] **Step 7: Implement migrate module**

```ts
// src/lib/api/migrate.ts
import { api } from './client';
import type { ProfileRow } from './profile';
import type { ModuleProgressRow } from './progress';

export interface BackfillPayload {
  profile?: {
    xp?: number; coins?: number; gems?: number;
    currentStreak?: number; longestStreak?: number;
    virtualBalance?: number;
    isPro?: boolean;
    preferences?: Record<string, unknown>;
  };
  modules?: Array<{
    moduleId: string;
    moduleName?: string;
    status?: 'not_started' | 'in_progress' | 'completed';
    bestScore?: number;
    xpEarned?: number;
  }>;
}

export function postBackfillV1(payload: BackfillPayload) {
  return api.post<BackfillPayload, { ok: true; profile: ProfileRow; progress: ModuleProgressRow[] }>(
    '/api/migrate/backfill-v1',
    payload,
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/api/
git commit -m "feat(client): per-resource API modules for profile/economy/subscription/streak/progress/userStats/migrate"
```

---

## Group F — Client: React Query hooks

### Task F1: useProfile hook

**Files:**
- Create: `src/features/auth/useProfile.ts`

- [ ] **Step 1: Implement**

```ts
// src/features/auth/useProfile.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile, type ProfileRow } from '../../lib/api/profile';

export const profileQueryKey = ['profile'] as const;

export function useProfile() {
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: async () => (await getProfile()).profile,
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Parameters<typeof updateProfile>[0]) => (await updateProfile(patch)).profile,
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: profileQueryKey });
      const prev = qc.getQueryData<ProfileRow | null>(profileQueryKey);
      qc.setQueryData<ProfileRow | null>(profileQueryKey, (old) =>
        old ? { ...old, ...patch } : old,
      );
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(profileQueryKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: profileQueryKey }),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/auth/useProfile.ts
git commit -m "feat(client): useProfile + useUpdateProfile hooks"
```

### Task F2: useEconomy hook with optimistic deltas

**Files:**
- Create: `src/features/economy/useEconomy.ts`

- [ ] **Step 1: Implement**

```ts
// src/features/economy/useEconomy.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applyEconomyDelta, getEconomy, type Economy } from '../../lib/api/economy';

export const economyQueryKey = ['economy'] as const;

export function useEconomy() {
  return useQuery({
    queryKey: economyQueryKey,
    queryFn: async () => (await getEconomy()).economy,
    staleTime: 30_000,
  });
}

interface DeltaInput {
  xpDelta?: number;
  coinsDelta?: number;
  gemsDelta?: number;
  virtualBalanceSet?: number;
}

export function useApplyEconomyDelta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeltaInput) => (await applyEconomyDelta(input)).economy,
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: economyQueryKey });
      const prev = qc.getQueryData<Economy | null>(economyQueryKey);
      qc.setQueryData<Economy | null>(economyQueryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          xp: (old.xp ?? 0) + (input.xpDelta ?? 0),
          coins: (old.coins ?? 0) + (input.coinsDelta ?? 0),
          gems: (old.gems ?? 0) + (input.gemsDelta ?? 0),
          virtualBalance: typeof input.virtualBalanceSet === 'number'
            ? input.virtualBalanceSet.toString()
            : old.virtualBalance,
        };
      });
      return { prev };
    },
    onError: (_e, _i, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(economyQueryKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: economyQueryKey }),
  });
}

// Convenience wrappers — keep the call sites readable.
export function useAwardXp() {
  const { mutate } = useApplyEconomyDelta();
  return (amount: number) => mutate({ xpDelta: amount });
}
export function useAwardCoins() {
  const { mutate } = useApplyEconomyDelta();
  return (amount: number) => mutate({ coinsDelta: amount });
}
export function useSpendCoins() {
  const { mutate } = useApplyEconomyDelta();
  return (amount: number) => mutate({ coinsDelta: -amount });
}
export function useAwardGems() {
  const { mutate } = useApplyEconomyDelta();
  return (amount: number) => mutate({ gemsDelta: amount });
}
export function useSpendGems() {
  const { mutate } = useApplyEconomyDelta();
  return (amount: number) => mutate({ gemsDelta: -amount });
}
export function useSetVirtualBalance() {
  const { mutate } = useApplyEconomyDelta();
  return (value: number) => mutate({ virtualBalanceSet: value });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/economy/useEconomy.ts
git commit -m "feat(client): useEconomy with optimistic delta mutations"
```

### Task F3: useStreak hook

**Files:**
- Create: `src/features/economy/useStreak.ts`

- [ ] **Step 1: Implement**

```ts
// src/features/economy/useStreak.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getStreak, recordDailyActivity, type StreakState } from '../../lib/api/streak';

export const streakQueryKey = ['streak'] as const;

export function useStreak() {
  return useQuery({
    queryKey: streakQueryKey,
    queryFn: async () => (await getStreak()).streak,
    staleTime: 60_000,
  });
}

function todayIsraelDate(): string {
  // Asia/Jerusalem date in YYYY-MM-DD. Intl gives us this with no dep.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date());
}

export function useRecordDailyActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await recordDailyActivity(todayIsraelDate())).streak,
    onSuccess: (streak) => {
      qc.setQueryData<StreakState | null>(streakQueryKey, streak);
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/economy/useStreak.ts
git commit -m "feat(client): useStreak + useRecordDailyActivity (Israel timezone)"
```

### Task F4: useSubscription hook

**Files:**
- Create: `src/features/subscription/useSubscription.ts`

- [ ] **Step 1: Implement**

```ts
// src/features/subscription/useSubscription.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSubscription, syncSubscription, type SubscriptionState } from '../../lib/api/subscription';
import { checkProEntitlement, RC_ENTITLEMENT_PRO } from '../../services/revenueCat';
import type { CustomerInfo } from '../../services/revenueCat';

export const subscriptionQueryKey = ['subscription'] as const;

export function useSubscription() {
  return useQuery({
    queryKey: subscriptionQueryKey,
    queryFn: async () => (await getSubscription()).subscription,
    staleTime: 30_000,
  });
}

export function useIsPro(): boolean {
  const { data } = useSubscription();
  return data?.isPro === true;
}

// Reconcile RevenueCat customerInfo into the server. Called by the RC listener
// in lifecycle.ts whenever entitlements change, AND once on app start.
export function useSyncFromRevenueCat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (customerInfo: CustomerInfo | null) => {
      const isPro = customerInfo
        ? customerInfo.entitlements.active[RC_ENTITLEMENT_PRO] !== undefined
        : await checkProEntitlement();
      const proExpiresAt = customerInfo?.entitlements.active[RC_ENTITLEMENT_PRO]?.expirationDate ?? null;
      return (await syncSubscription({ isPro, proExpiresAt })).subscription;
    },
    onSuccess: (sub) => {
      qc.setQueryData<SubscriptionState | null>(subscriptionQueryKey, sub);
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/subscription/useSubscription.ts
git commit -m "feat(client): useSubscription + useSyncFromRevenueCat hooks"
```

### Task F5: useProgress hook

**Files:**
- Create: `src/features/chapter-1-content/useProgress.ts`

- [ ] **Step 1: Implement**

```ts
// src/features/chapter-1-content/useProgress.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProgress, upsertModuleProgress, type ModuleProgressRow } from '../../lib/api/progress';

export const progressQueryKey = ['progress'] as const;

export function useProgress() {
  return useQuery({
    queryKey: progressQueryKey,
    queryFn: async () => (await getProgress()).progress,
    staleTime: 5 * 60_000,
  });
}

// Derived selectors for the most common call sites.
export function useIsModuleCompleted(moduleId: string): boolean {
  const { data } = useProgress();
  if (!data) return false;
  const row = data.find((m) => m.moduleId === moduleId);
  return row?.status === 'completed';
}

export function useUpsertModuleProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Parameters<typeof upsertModuleProgress>[0]) =>
      (await upsertModuleProgress(payload)).progress,
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: progressQueryKey });
      const prev = qc.getQueryData<ModuleProgressRow[]>(progressQueryKey);
      qc.setQueryData<ModuleProgressRow[]>(progressQueryKey, (old) => {
        const next = old ? [...old] : [];
        const idx = next.findIndex((m) => m.moduleId === payload.moduleId);
        const optimistic: ModuleProgressRow = {
          moduleId: payload.moduleId,
          moduleName: payload.moduleName ?? null,
          status: payload.status ?? 'completed',
          quizScore: payload.quizScore ?? null,
          quizAttempts: payload.quizAttempts ?? null,
          bestScore: payload.bestScore ?? null,
          xpEarned: payload.xpEarned ?? null,
          completedAt: payload.status === 'completed' ? new Date().toISOString() : null,
        };
        if (idx >= 0) next[idx] = optimistic;
        else next.push(optimistic);
        return next;
      });
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(progressQueryKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: progressQueryKey }),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/chapter-1-content/useProgress.ts
git commit -m "feat(client): useProgress + useUpsertModuleProgress with optimistic update"
```

### Task F6: useUserStats hook

**Files:**
- Create: `src/features/user-stats/useUserStats.ts`

- [ ] **Step 1: Implement**

```ts
// src/features/user-stats/useUserStats.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserStats, recordSessionTime, recordModuleDuration, type UserStatsRow } from '../../lib/api/userStats';

export const userStatsQueryKey = ['user-stats'] as const;

export function useUserStats() {
  return useQuery({
    queryKey: userStatsQueryKey,
    queryFn: async () => (await getUserStats()).userStats,
    staleTime: 5 * 60_000,
  });
}

export function useRecordSessionTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (seconds: number) => (await recordSessionTime(seconds)).userStats,
    onSuccess: (data) => qc.setQueryData<UserStatsRow | null>(userStatsQueryKey, data),
  });
}

export function useRecordModuleDuration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { moduleId: string; seconds: number }) =>
      (await recordModuleDuration(input.moduleId, input.seconds)).userStats,
    onSuccess: (data) => qc.setQueryData<UserStatsRow | null>(userStatsQueryKey, data),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/user-stats/useUserStats.ts
git commit -m "feat(client): useUserStats hooks for session time and module durations"
```

---

## Group G — Client: auth lifecycle refactor

### Task G1: Update `revenueCat.ts` to allow re-configure

**Files:**
- Modify: `src/services/revenueCat.ts`

- [ ] **Step 1: Adjust `configureRevenueCat` to be idempotent per user**

In `src/services/revenueCat.ts`, replace the `configureRevenueCat` function and remove the `isConfigured` flag:

```ts
// Replace the existing isConfigured + configureRevenueCat block with:
let configuredFor: string | null = null;

export function configureRevenueCat(appUserId?: string): void {
  if (IS_WEB || !Purchases) return;

  // If already configured for the same user, no-op.
  const targetId = appUserId ?? null;
  if (configuredFor === targetId) return;

  const apiKey = Platform.OS === 'ios' ? RC_API_KEY_APPLE : RC_API_KEY_GOOGLE;
  if (!apiKey) {
    if (__DEV__) console.warn('[RevenueCat] No API key found — skipping init (dev mode)');
    return;
  }

  Purchases.configure({ apiKey, appUserID: appUserId ?? undefined });

  if (__DEV__ && LOG_LEVEL_DEBUG !== undefined) {
    Purchases.setLogLevel(LOG_LEVEL_DEBUG);
  }

  configuredFor = targetId;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/revenueCat.ts
git commit -m "refactor(rc): allow re-configuring RevenueCat with a different appUserID"
```

### Task G2: Auth lifecycle module

**Files:**
- Create: `src/lib/auth/lifecycle.ts`

- [ ] **Step 1: Implement**

```ts
// src/lib/auth/lifecycle.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  configureRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
  getCustomerInfo,
} from '../../services/revenueCat';
import { tokenStore, backfillFlag } from './secureStore';
import { queryClient } from '../queryClient';
import { resetAllLocalStores, getLocalStorageKeys } from '../stores/registry';
import { runBackfillV1 } from './backfill';
import { profileQueryKey } from '../../features/auth/useProfile';
import { economyQueryKey } from '../../features/economy/useEconomy';
import { streakQueryKey } from '../../features/economy/useStreak';
import { subscriptionQueryKey } from '../../features/subscription/useSubscription';
import { progressQueryKey } from '../../features/chapter-1-content/useProgress';
import { userStatsQueryKey } from '../../features/user-stats/useUserStats';
import { getProfile } from '../api/profile';
import { getEconomy } from '../api/economy';
import { getStreak } from '../api/streak';
import { getSubscription } from '../api/subscription';
import { getProgress } from '../api/progress';
import { getUserStats } from '../api/userStats';
import { syncSubscription } from '../api/subscription';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { RC_ENTITLEMENT_PRO } from '../../services/revenueCat';

type ProfileLike = { id: string; authId: string; displayName: string | null; email: string | null };

async function prefetchAll(): Promise<void> {
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: profileQueryKey, queryFn: async () => (await getProfile()).profile }),
    queryClient.prefetchQuery({ queryKey: economyQueryKey, queryFn: async () => (await getEconomy()).economy }),
    queryClient.prefetchQuery({ queryKey: streakQueryKey, queryFn: async () => (await getStreak()).streak }),
    queryClient.prefetchQuery({ queryKey: subscriptionQueryKey, queryFn: async () => (await getSubscription()).subscription }),
    queryClient.prefetchQuery({ queryKey: progressQueryKey, queryFn: async () => (await getProgress()).progress }),
    queryClient.prefetchQuery({ queryKey: userStatsQueryKey, queryFn: async () => (await getUserStats()).userStats }),
  ]);
}

async function syncRevenueCatToServer(): Promise<void> {
  const customerInfo = await getCustomerInfo();
  const isPro = customerInfo?.entitlements.active[RC_ENTITLEMENT_PRO] !== undefined;
  const proExpiresAt = customerInfo?.entitlements.active[RC_ENTITLEMENT_PRO]?.expirationDate ?? null;
  await syncSubscription({ isPro, proExpiresAt });
  await queryClient.invalidateQueries({ queryKey: subscriptionQueryKey });
}

// Called by LoginScreen after /auth/verify returns { profile, token }.
export async function signInWithProfile(profile: ProfileLike, token: string): Promise<void> {
  await tokenStore.set(token);

  configureRevenueCat(profile.id);
  await loginRevenueCat(profile.id).catch(() => { /* RC sometimes flakes; treat as soft */ });

  // Run backfill BEFORE prefetch so the prefetched data is already the merged result.
  if (!(await backfillFlag.isDone())) {
    try {
      await runBackfillV1();
      await backfillFlag.markDone();
    } catch (e) {
      // Don't block sign-in — backfill will retry on next launch.
      if (__DEV__) console.warn('[backfill] failed:', e);
    }
  }

  await prefetchAll();
  await syncRevenueCatToServer();

  useAuthStore.getState().signIn({
    userId: profile.id,
    authId: profile.authId,
    displayName: profile.displayName ?? null,
    email: profile.email ?? null,
  });
}

// Called by MoreScreen on the sign-out button.
export async function signOut(): Promise<void> {
  try { await logoutRevenueCat(); } catch { /* swallow */ }

  queryClient.clear();
  resetAllLocalStores();

  const keys = getLocalStorageKeys();
  if (keys.length > 0) {
    await AsyncStorage.multiRemove(keys).catch(() => { /* swallow */ });
  }

  await tokenStore.clear();
  await backfillFlag.reset(); // Re-run backfill if user signs back in on this device

  useAuthStore.getState().clear();
}

// Called by app/_layout.tsx on cold launch.
export async function bootFromToken(): Promise<{ isAuthenticated: boolean }> {
  const token = await tokenStore.get();
  if (!token) return { isAuthenticated: false };

  let profile;
  try {
    profile = (await getProfile()).profile;
  } catch (e) {
    // 401 will have triggered tokenStore.clear via onUnauthorized; treat as not authed.
    if (__DEV__) console.warn('[boot] profile fetch failed:', e);
    return { isAuthenticated: false };
  }
  if (!profile) return { isAuthenticated: false };

  configureRevenueCat(profile.id);
  await loginRevenueCat(profile.id).catch(() => { /* soft */ });

  if (!(await backfillFlag.isDone())) {
    try {
      await runBackfillV1();
      await backfillFlag.markDone();
    } catch (e) {
      if (__DEV__) console.warn('[backfill] failed at boot:', e);
    }
  }

  await prefetchAll();
  await syncRevenueCatToServer();

  useAuthStore.getState().signIn({
    userId: profile.id,
    authId: profile.authId,
    displayName: profile.displayName ?? null,
    email: profile.email ?? null,
  });

  return { isAuthenticated: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/auth/lifecycle.ts
git commit -m "feat(client): auth lifecycle — boot/sign-in/sign-out orchestration"
```

### Task G3: Hook up 401 handler to sign-out

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Wire onUnauthorized in the root layout**

In `app/_layout.tsx`, near the top (after imports, before any provider):

```ts
import { setOnUnauthorized } from '../src/lib/api/client';
import { signOut as lifecycleSignOut } from '../src/lib/auth/lifecycle';

setOnUnauthorized(() => {
  lifecycleSignOut().catch(() => { /* swallow */ });
});
```

- [ ] **Step 2: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(client): wire 401 interceptor to trigger sign-out"
```

### Task G4: Slim down `useAuthStore`

**Files:**
- Modify: `src/features/auth/useAuthStore.ts`

- [ ] **Step 1: Rewrite the store**

Replace the entire file with:

```ts
// src/features/auth/useAuthStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';

interface SessionState {
  userId: string | null;
  authId: string | null;
  displayName: string | null;
  email: string | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  isGuest: boolean;
}

interface SessionActions {
  signIn: (params: { userId: string; authId: string; displayName: string | null; email: string | null }) => void;
  setOnboardingCompleted: (value: boolean) => void;
  setIsGuest: (value: boolean) => void;
  clear: () => void;
  reset: () => void;
  devResetProgress?: () => void;
}

const initialState: SessionState = {
  userId: null,
  authId: null,
  displayName: null,
  email: null,
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  isGuest: false,
};

export const useAuthStore = create<SessionState & SessionActions>()(
  persist(
    (set) => ({
      ...initialState,
      signIn: (params) =>
        set({
          userId: params.userId,
          authId: params.authId,
          displayName: params.displayName,
          email: params.email,
          isAuthenticated: true,
          isGuest: false,
        }),
      setOnboardingCompleted: (value) => set({ hasCompletedOnboarding: value }),
      setIsGuest: (value) => set({ isGuest: value }),
      clear: () => set(initialState),
      reset: () => set(initialState),
      ...(__DEV__ ? {
        devResetProgress: () => {
          // DEV-ONLY: wipes everything except the auth row.
          // Production builds do not include this method.
          import('@react-native-async-storage/async-storage').then((AsyncStorage) => {
            AsyncStorage.default.getAllKeys().then((keys) => {
              const toRemove = keys.filter((k) => k !== 'auth-store-v3');
              if (toRemove.length > 0) AsyncStorage.default.multiRemove(toRemove);
            }).catch(() => { /* swallow */ });
          });
        },
      } : {}),
    }),
    {
      name: 'auth-store-v3', // bumped from v2 to invalidate the old shape
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        userId: state.userId,
        authId: state.authId,
        displayName: state.displayName,
        email: state.email,
        isAuthenticated: state.isAuthenticated,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        isGuest: state.isGuest,
      }),
    },
  ),
);

registerLocalStore('auth-store-v3', useAuthStore, 'auth-store-v3');
```

Notes:
- The legacy `profile` object (with financialGoal, knowledgeLevel, companionId, etc.) is gone — that data lives in react-query `['profile']` now, derived from server.
- The old `syncToken` field is gone — JWT replaces it, stored in expo-secure-store, not in this Zustand store.
- The legacy `createdAt` field is gone — comes from `userProfiles.createdAt` on the server.
- `devResetProgress` exists only when `__DEV__` is true.

- [ ] **Step 2: Update LoginScreen to use the new sign-in**

In `src/features/auth/LoginScreen.tsx`, find the block around lines 70–83 (the existing email login flow with `fetchUserProfile` + `setVirtualBalance`). Replace with:

```ts
import { signInWithProfile } from '../../lib/auth/lifecycle';

// Inside the email-login handler:
const response = await fetch('/api/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ provider: 'email', email: email.trim().toLowerCase(), displayName: name }),
});
const data = await response.json();
if (!data?.ok || !data.profile || !data.token) {
  // handle error UI
  return;
}
await signInWithProfile(data.profile, data.token);
router.replace('/(tabs)/' as never);
```

Apply the same pattern to the Google login handler.

- [ ] **Step 3: Update MoreScreen sign-out**

In `src/features/more/MoreScreen.tsx` find the `handleSignOut` function. Replace with:

```ts
import { signOut as lifecycleSignOut } from '../../lib/auth/lifecycle';

function handleSignOut() {
  Alert.alert(
    "יציאה מהחשבון",
    "בטוחים שאתם רוצים לצאת?",
    [
      { text: "ביטול", style: "cancel" },
      {
        text: "יציאה",
        style: "destructive",
        onPress: async () => {
          await lifecycleSignOut();
          router.replace("/(auth)/onboarding" as never);
        },
      },
    ]
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/auth/useAuthStore.ts src/features/auth/LoginScreen.tsx src/features/more/MoreScreen.tsx
git commit -m "refactor(auth): slim useAuthStore to session-only; wire sign-in/sign-out to lifecycle"
```

### Task G5: Boot the app from token on cold launch

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Add cold-launch boot effect**

Inside the root component in `app/_layout.tsx`, add this effect (place it AFTER the QueryClientProvider wrapping is in place):

```tsx
import { useEffect, useState } from 'react';
import { bootFromToken } from '../src/lib/auth/lifecycle';

// Inside the component:
const [bootComplete, setBootComplete] = useState(false);

useEffect(() => {
  bootFromToken().finally(() => setBootComplete(true));
}, []);

if (!bootComplete) {
  // Existing splash-screen UI stays visible until we've decided where to route.
  return null;
}
```

Note: the existing `expo-splash-screen` setup should continue to keep the native splash up during the boot window. If the project doesn't already call `SplashScreen.hideAsync()` from a boot effect, hide it after `setBootComplete(true)`.

- [ ] **Step 2: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(app): cold-launch boot from JWT before rendering routes"
```

### Task G6: ProfileBootScreen for sign-in window

**Files:**
- Create: `src/features/auth/ProfileBootScreen.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/features/auth/ProfileBootScreen.tsx
import { useEffect, useState } from 'react';
import { View, Text, Image, ActivityIndicator, Pressable } from 'react-native';

interface ProfileBootScreenProps {
  // True while sign-in is loading data. False once we should navigate away.
  loading: boolean;
  // Called when the user taps "Retry" after a long timeout.
  onRetry?: () => void;
}

export function ProfileBootScreen({ loading, onRetry }: ProfileBootScreenProps) {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowRetry(false);
      return;
    }
    const t = setTimeout(() => setShowRetry(true), 8000);
    return () => clearTimeout(t);
  }, [loading]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      {/* Use the existing Daisy mascot asset path used elsewhere in the app */}
      <Image
        source={require('../../../assets/daisy/daisy-standard.webp')}
        style={{ width: 140, height: 140 }}
        resizeMode="contain"
      />
      <ActivityIndicator className="mt-6" />
      <Text className="mt-3 text-foreground font-medium">טוען את הפרופיל שלך…</Text>
      {showRetry && onRetry && (
        <Pressable
          className="mt-6 px-5 py-3 rounded-full bg-accent"
          onPress={onRetry}
        >
          <Text className="text-accent-foreground font-semibold">תקלת רשת — נסו שוב</Text>
        </Pressable>
      )}
    </View>
  );
}
```

Note: replace the `require` path with whatever Daisy asset the codebase actually uses. The component is referenced from `LoginScreen` and routes that need to wait on the sign-in prefetch.

- [ ] **Step 2: Wire into LoginScreen**

In `LoginScreen.tsx`, gate the post-`signInWithProfile()` navigation behind a `signingIn` state and render `<ProfileBootScreen loading />` while `signingIn === true`. Concrete shape:

```tsx
const [signingIn, setSigningIn] = useState(false);

async function handleEmailLogin() {
  setSigningIn(true);
  try {
    const response = await fetch('/api/auth/verify', { /* ... */ });
    const data = await response.json();
    if (!data?.ok || !data.profile || !data.token) {
      // surface error
      setSigningIn(false);
      return;
    }
    await signInWithProfile(data.profile, data.token);
    router.replace('/(tabs)/' as never);
  } catch {
    setSigningIn(false);
  }
}

// In the render:
if (signingIn) {
  return <ProfileBootScreen loading onRetry={() => setSigningIn(false)} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/ProfileBootScreen.tsx src/features/auth/LoginScreen.tsx
git commit -m "feat(auth): ProfileBootScreen during sign-in prefetch window"
```

---

## Group H — Client: legacy local state reader and backfill orchestrator

### Task H1: Write failing test for legacy local state reader

**Files:**
- Create: `scripts/test-legacy-local-state.ts`
- Create: `src/lib/auth/legacyLocalState.ts` (stub)

- [ ] **Step 1: Create the stub**

```ts
// src/lib/auth/legacyLocalState.ts
// Stub — implementation in Task H2.
export interface LegacyLocalState {
  profile?: {
    xp?: number; coins?: number; gems?: number;
    currentStreak?: number; longestStreak?: number;
    virtualBalance?: number;
    isPro?: boolean;
    preferences?: Record<string, unknown>;
  };
  modules?: Array<{ moduleId: string; status?: 'completed' | 'in_progress'; bestScore?: number; xpEarned?: number; moduleName?: string }>;
}

// Reads from a provided storage adapter so the function is unit-testable
// without coupling to AsyncStorage at import time.
export interface StorageReader {
  getItem(key: string): Promise<string | null>;
}

export async function readLegacyLocalState(_storage: StorageReader): Promise<LegacyLocalState> {
  throw new Error('not implemented');
}
```

- [ ] **Step 2: Write the failing test script**

```ts
// scripts/test-legacy-local-state.ts
// Run: npx tsx scripts/test-legacy-local-state.ts
import { readLegacyLocalState } from '../src/lib/auth/legacyLocalState';

let failed = 0;
function check(cond: boolean, label: string): void {
  if (cond) console.log(`PASS: ${label}`);
  else { console.error(`FAIL: ${label}`); failed++; }
}

class MockStorage {
  store = new Map<string, string>();
  async getItem(key: string) { return this.store.get(key) ?? null; }
  set(key: string, value: string) { this.store.set(key, value); }
}

(async () => {
  // Empty storage → empty result.
  {
    const s = new MockStorage();
    const result = await readLegacyLocalState(s);
    check(Object.keys(result).length === 0, 'empty storage yields empty result');
  }

  // Economy store with xp/coins/gems.
  {
    const s = new MockStorage();
    s.set('economy-store', JSON.stringify({
      state: { xp: 1500, coins: 800, gems: 25, virtualBalance: 120000 },
      version: 0,
    }));
    const result = await readLegacyLocalState(s);
    check(result.profile?.xp === 1500, 'economy: xp read');
    check(result.profile?.coins === 800, 'economy: coins read');
    check(result.profile?.gems === 25, 'economy: gems read');
    check(result.profile?.virtualBalance === 120000, 'economy: virtualBalance read');
  }

  // Subscription store with tier=pro.
  {
    const s = new MockStorage();
    s.set('subscription-storage', JSON.stringify({
      state: { tier: 'pro', status: 'active' },
    }));
    const result = await readLegacyLocalState(s);
    check(result.profile?.isPro === true, 'subscription: tier=pro maps to isPro=true');
  }

  // Subscription store with tier=basic.
  {
    const s = new MockStorage();
    s.set('subscription-storage', JSON.stringify({ state: { tier: 'basic', status: 'inactive' } }));
    const result = await readLegacyLocalState(s);
    check(result.profile?.isPro === false, 'subscription: tier=basic maps to isPro=false');
  }

  // Auth store with profile sub-object → preferences.
  {
    const s = new MockStorage();
    s.set('auth-store-v2', JSON.stringify({
      state: {
        email: 'a@b.com',
        profile: {
          companionId: 'warren-buffett',
          financialGoal: 'fire',
          knowledgeLevel: 'intermediate',
          avatarId: 'a1',
        },
      },
    }));
    const result = await readLegacyLocalState(s);
    check((result.profile?.preferences as { companionId: string })?.companionId === 'warren-buffett', 'auth: preferences extracted');
  }

  // Chapter store with progress map.
  {
    const s = new MockStorage();
    s.set('chapter-store', JSON.stringify({
      state: {
        progress: {
          'ch-1': { completedModules: ['m1', 'm2'], moduleQuizScores: { m1: 80, m2: 95 } },
        },
      },
      version: 2,
    }));
    const result = await readLegacyLocalState(s);
    check(Array.isArray(result.modules), 'chapter: modules array produced');
    check((result.modules ?? []).some((m) => m.moduleId === 'm1' && m.status === 'completed'), 'chapter: m1 completed');
    check((result.modules ?? []).some((m) => m.moduleId === 'm2' && m.bestScore === 95), 'chapter: m2 bestScore=95');
  }

  // Streak from economy store.
  {
    const s = new MockStorage();
    s.set('economy-store', JSON.stringify({ state: { currentStreak: 5, longestStreak: 12 } }));
    const result = await readLegacyLocalState(s);
    check(result.profile?.currentStreak === 5, 'economy: currentStreak read');
    check(result.profile?.longestStreak === 12, 'economy: longestStreak read');
  }

  // Corrupted JSON → graceful skip.
  {
    const s = new MockStorage();
    s.set('economy-store', '{not valid json');
    const result = await readLegacyLocalState(s);
    check(result.profile === undefined, 'corrupted economy store skipped without throwing');
  }

  if (failed > 0) { console.error(`${failed} tests failed.`); process.exit(1); }
  console.log('All legacy-local-state tests passed.');
})();
```

- [ ] **Step 3: Run to verify failure**

```bash
npx tsx scripts/test-legacy-local-state.ts
```

Expected: throws "not implemented".

### Task H2: Implement legacy local state reader

**Files:**
- Modify: `src/lib/auth/legacyLocalState.ts`

- [ ] **Step 1: Replace stub**

```ts
// src/lib/auth/legacyLocalState.ts
export interface LegacyLocalState {
  profile?: {
    xp?: number; coins?: number; gems?: number;
    currentStreak?: number; longestStreak?: number;
    virtualBalance?: number;
    isPro?: boolean;
    preferences?: Record<string, unknown>;
  };
  modules?: Array<{ moduleId: string; status?: 'completed' | 'in_progress'; bestScore?: number; xpEarned?: number; moduleName?: string }>;
}

export interface StorageReader {
  getItem(key: string): Promise<string | null>;
}

function safeParse(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
}

function getState(raw: string | null): Record<string, unknown> | null {
  const parsed = safeParse(raw);
  if (!parsed) return null;
  // Zustand persist wraps payload in `{ state, version }`.
  if (typeof parsed.state === 'object' && parsed.state !== null) {
    return parsed.state as Record<string, unknown>;
  }
  return parsed;
}

function num(x: unknown): number | undefined {
  return typeof x === 'number' && Number.isFinite(x) ? x : undefined;
}

export async function readLegacyLocalState(storage: StorageReader): Promise<LegacyLocalState> {
  const out: LegacyLocalState = {};

  const economy = getState(await storage.getItem('economy-store'));
  if (economy) {
    out.profile = out.profile ?? {};
    out.profile.xp = num(economy.xp);
    out.profile.coins = num(economy.coins);
    out.profile.gems = num(economy.gems);
    out.profile.currentStreak = num(economy.currentStreak);
    out.profile.longestStreak = num(economy.longestStreak);
    out.profile.virtualBalance = num(economy.virtualBalance);
  }

  const subscription = getState(await storage.getItem('subscription-storage'));
  if (subscription) {
    out.profile = out.profile ?? {};
    out.profile.isPro = subscription.tier === 'pro' && subscription.status === 'active';
  }

  const auth = getState(await storage.getItem('auth-store-v2'));
  if (auth && typeof auth.profile === 'object' && auth.profile !== null) {
    out.profile = out.profile ?? {};
    out.profile.preferences = auth.profile as Record<string, unknown>;
  }

  const chapter = getState(await storage.getItem('chapter-store'));
  if (chapter && typeof chapter.progress === 'object' && chapter.progress !== null) {
    const modules: LegacyLocalState['modules'] = [];
    for (const chapterEntry of Object.values(chapter.progress as Record<string, unknown>)) {
      if (typeof chapterEntry !== 'object' || chapterEntry === null) continue;
      const c = chapterEntry as Record<string, unknown>;
      const completedModules = Array.isArray(c.completedModules) ? c.completedModules : [];
      const scores = (typeof c.moduleQuizScores === 'object' && c.moduleQuizScores !== null)
        ? c.moduleQuizScores as Record<string, number>
        : {};
      const completedSet = new Set(completedModules.filter((m): m is string => typeof m === 'string'));
      const allModuleIds = new Set([...completedSet, ...Object.keys(scores)]);
      for (const moduleId of allModuleIds) {
        modules.push({
          moduleId,
          status: completedSet.has(moduleId) ? 'completed' : 'in_progress',
          bestScore: num(scores[moduleId]),
        });
      }
    }
    if (modules.length > 0) out.modules = modules;
  }

  return out;
}
```

- [ ] **Step 2: Re-run test to verify pass**

```bash
npx tsx scripts/test-legacy-local-state.ts
```

Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/legacyLocalState.ts scripts/test-legacy-local-state.ts
git commit -m "feat(client): legacy local state reader with TDD coverage"
```

### Task H3: Backfill orchestrator

**Files:**
- Create: `src/lib/auth/backfill.ts`

- [ ] **Step 1: Implement**

```ts
// src/lib/auth/backfill.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readLegacyLocalState } from './legacyLocalState';
import { postBackfillV1 } from '../api/migrate';
import { queryClient } from '../queryClient';
import { profileQueryKey } from '../../features/auth/useProfile';
import { progressQueryKey } from '../../features/chapter-1-content/useProgress';

// Complete list of legacy keys; the wipe step uses this AFTER backfill succeeds.
// Audited as of 2026-05-21 — finalize during P0 review by grepping the codebase
// for `persist({ name: …` and reconciling.
export const LEGACY_KEYS_V0: string[] = [
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

export async function runBackfillV1(): Promise<void> {
  const local = await readLegacyLocalState(AsyncStorage);

  if (!local.profile && !local.modules) {
    // No legacy data to migrate; skip and still mark done.
    return;
  }

  const response = await postBackfillV1({
    profile: local.profile,
    modules: local.modules,
  });

  // Pre-warm caches with the response so the prefetch step is fast.
  queryClient.setQueryData(profileQueryKey, response.profile);
  queryClient.setQueryData(progressQueryKey, response.progress);

  // Wipe legacy keys for server-backed stores ONLY after success.
  // Note: this wipes Bin B keys too, which is fine — they'll re-initialize
  // empty on next access and re-register via registerLocalStore() at module load.
  await AsyncStorage.multiRemove(LEGACY_KEYS_V0).catch(() => { /* swallow */ });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/auth/backfill.ts
git commit -m "feat(client): one-time backfill orchestrator with cache pre-warm and legacy wipe"
```

---

## Group I — Client: deletions and consumer migrations

This is the most invasive group. The order matters: hooks must exist (Group F) before consumers can migrate to them, then stores can be deleted only after all consumers stop importing them.

### Task I1: Find every consumer of `useSubscriptionStore`

- [ ] **Step 1: Enumerate consumers**

```bash
grep -r "useSubscriptionStore" src/ app/ --include="*.ts" --include="*.tsx" -l
```

Save the list. Each file gets visited in Task I2.

### Task I2: Migrate consumers off `useSubscriptionStore`

**Files:**
- Modify: every file in the I1 list

- [ ] **Step 1: For each file, replace the import and call sites**

Pattern:

```ts
// BEFORE:
import { useSubscriptionStore } from '../../features/subscription/useSubscriptionStore';
const isPro = useSubscriptionStore((s) => s.isPro());
const hearts = useSubscriptionStore((s) => s.hearts);

// AFTER:
import { useSubscription, useIsPro } from '../../features/subscription/useSubscription';
const isPro = useIsPro();
// Note: hearts is a SEPARATE legacy concern not part of subscription per the spec —
// if hearts is referenced, replace with whatever the new heart model is. For P0,
// keep hearts as a local-only ephemeral resource (it regenerates anyway).
```

For each file, look for any methods that mutated the subscription store (`syncWithRevenueCat`, `startRevenueCatListener`, `setTier`, etc.) — these all go away. The RC sync now happens inside `lifecycle.ts`; consumers no longer call it.

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: all references to the deleted store API removed. Errors only on hearts if any.

- [ ] **Step 3: Commit per logical group**

```bash
# E.g., commit per feature area:
git add src/features/<feature>/
git commit -m "refactor: migrate <feature> from useSubscriptionStore to useSubscription hook"
```

### Task I3: Delete `useSubscriptionStore`

**Files:**
- Delete: `src/features/subscription/useSubscriptionStore.ts`

- [ ] **Step 1: Delete the file**

```bash
git rm src/features/subscription/useSubscriptionStore.ts
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor: remove useSubscriptionStore (replaced by useSubscription hook)"
```

### Tasks I4 / I5 / I6 — Repeat I1–I3 for `useEconomyStore`, `useChapterStore`, `useUserStatsStore`

The pattern is identical:

- **I4 (useEconomyStore):**
  - `useEconomyStore((s) => s.xp)` → `useEconomy().data?.xp`
  - `useEconomyStore.getState().addXp(N)` → call `useAwardXp()(N)` (from a hook context) OR `import { useAwardXp } from ...; const award = useAwardXp(); award(N);`
  - `getState().setVirtualBalance(N)` → `useSetVirtualBalance()(N)` (from a hook context)
  - For non-hook contexts (e.g., service files), import `applyEconomyDelta` from `src/lib/api/economy.ts` directly and call it; manually invalidate `economyQueryKey` after.
  - Streak fields (`currentStreak`, `longestStreak`) move to `useStreak().data?.currentStreak`.

- **I5 (useChapterStore):**
  - `useChapterStore((s) => s.progress[chId]?.completedModules)` → derive from `useProgress().data` filtered by chapter prefix or another mapping. The new `moduleProgress` table is flat, not nested per chapter — the migration includes implicitly mapping chapter from moduleId prefix (or adding `chapterId` to the table later if needed in P1).
  - `useChapterStore.getState().markComplete(moduleId, score)` → `useUpsertModuleProgress().mutate({ moduleId, status: 'completed', bestScore: score, xpEarned: ... })`

- **I6 (useUserStatsStore):**
  - `useUserStatsStore((s) => s.totalSeconds)` → `useUserStats().data?.totalSessionSeconds`
  - `getState().recordModuleTime(id, s)` → `useRecordModuleDuration().mutate({ moduleId: id, seconds: s })`

For each: spawn the I1-style grep, migrate consumers one file at a time, delete the store last, commit incrementally.

### Task I7: Register every Bin B store

Audit the Bin B list (Section 4 of the spec). For each store in the list:

**Files:**
- Modify: that store's file

- [ ] **Step 1: Add `reset` action and register**

Pattern for any kept Zustand store:

```ts
// At the top: import the registry helper.
import { registerLocalStore } from '../../lib/stores/registry';

// In the store definition, add a `reset` action returning to initial state:
const initialState = { /* ... */ };
export const useFooStore = create<...>()(
  persist(
    (set) => ({
      ...initialState,
      // existing actions ...
      reset: () => set(initialState),
    }),
    {
      name: 'foo-store-v1', // bump version if shape ever changes
      storage: createJSONStorage(() => zustandStorage),
      partialize: /* existing or none */,
    },
  ),
);

// At the bottom of the file:
registerLocalStore('foo-store-v1', useFooStore, 'foo-store-v1');
```

For unpersisted stores (no `persist()` middleware), pass `null` as the storageKey:

```ts
registerLocalStore('foo-transient', useFooStore, null);
```

- [ ] **Step 2: Bin B store list (do each one)**

- `useTutorialStore` (was `tutorial-store` → `tutorial-store-v1`)
- `useAudioStore` (was `audio-store` → `audio-store-v1`)
- `useShopModalStore`, `useUpgradeModalStore`, `useNudgeQueueStore`, `useTradingHubUiStore`, `useMonetizationIntentStore`
- `useLiveMarketStore` (transient, no persist)
- `useLifestyleBreakStore` (transient OK, no persist)
- All chapter-N-content simulation hooks (`useBudgetGame`, `useCarLoanGame`, `useCompoundSim`, etc.) — most have no persist; just `reset()` + register with `null` storageKey.

Commit per family:

```bash
git add src/stores/
git commit -m "refactor(stores): add reset+register to top-level Bin B stores"

git add src/features/chapter-1-content/simulations/
git commit -m "refactor(stores): add reset+register to chapter-1 simulations"

# etc per chapter
```

### Task I8: Verify the registry is complete

- [ ] **Step 1: Run a grep audit**

```bash
grep -rn "create(" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "createJSONStorage" > /tmp/zustand-stores.txt
grep -rn "registerLocalStore" src/ --include="*.ts" --include="*.tsx" > /tmp/registered.txt
```

Compare the two lists. Any Zustand store NOT in `registered.txt` is a miss. Add `registerLocalStore` to each missed file.

- [ ] **Step 2: Commit any fixes**

```bash
git add src/
git commit -m "refactor(stores): close registry coverage gaps"
```

---

## Group J — Listeners and foreground refetch

### Task J1: AppState foreground listener

**Files:**
- Create: `src/lib/auth/appStateListener.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Implement the listener**

```ts
// src/lib/auth/appStateListener.ts
import { AppState, type AppStateStatus } from 'react-native';
import { queryClient } from '../queryClient';
import { profileQueryKey } from '../../features/auth/useProfile';
import { economyQueryKey } from '../../features/economy/useEconomy';
import { streakQueryKey } from '../../features/economy/useStreak';
import { subscriptionQueryKey } from '../../features/subscription/useSubscription';
import { useAuthStore } from '../../features/auth/useAuthStore';

const REHYDRATE_AFTER_MS = 5 * 60 * 1000;

let lastBackgroundedAt: number | null = null;
let currentState: AppStateStatus = AppState.currentState;

export function startAppStateListener(): () => void {
  const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
    if (currentState.match(/active/) && next.match(/inactive|background/)) {
      lastBackgroundedAt = Date.now();
    }
    if (next === 'active') {
      const isAuthed = useAuthStore.getState().isAuthenticated;
      if (
        isAuthed &&
        lastBackgroundedAt !== null &&
        Date.now() - lastBackgroundedAt > REHYDRATE_AFTER_MS
      ) {
        queryClient.invalidateQueries({ queryKey: profileQueryKey });
        queryClient.invalidateQueries({ queryKey: economyQueryKey });
        queryClient.invalidateQueries({ queryKey: streakQueryKey });
        queryClient.invalidateQueries({ queryKey: subscriptionQueryKey });
      }
      lastBackgroundedAt = null;
    }
    currentState = next;
  });
  return () => sub.remove();
}
```

- [ ] **Step 2: Wire into root layout**

In `app/_layout.tsx`:

```ts
import { startAppStateListener } from '../src/lib/auth/appStateListener';

useEffect(() => {
  const stop = startAppStateListener();
  return stop;
}, []);
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/appStateListener.ts app/_layout.tsx
git commit -m "feat(client): AppState listener triggers refetch on foreground after 5min background"
```

### Task J2: NetInfo reconnect handling

NetInfo is already in `package.json` (per the earlier grep results). React Query's `refetchOnReconnect: true` in `queryClient.ts` already covers the reconnect case via `onlineManager`. We just need to wire `onlineManager` to NetInfo on RN — react-query does this with a small adapter.

**Files:**
- Modify: `src/lib/queryClient.ts`

- [ ] **Step 1: Wire NetInfo into react-query's onlineManager**

Add to `src/lib/queryClient.ts` at the bottom:

```ts
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/queryClient.ts
git commit -m "feat(client): wire NetInfo to react-query onlineManager for reconnect refetch"
```

---

## Group K — Cleanup

### Task K1: Remove `DEV_PRO_EMAILS` from any remaining references

`useSubscriptionStore` is already deleted (Task I3), which removes the largest references. Search for any leftovers:

- [ ] **Step 1: Grep and remove**

```bash
grep -rn "DEV_PRO_EMAILS" src/ app/ --include="*.ts" --include="*.tsx"
```

Delete each remaining occurrence (and the associated logic).

- [ ] **Step 2: Commit**

```bash
git add src/ app/
git commit -m "cleanup: remove DEV_PRO_EMAILS hardcoded list"
```

### Task K2: Confirm `devResetProgress` is `__DEV__`-gated

Done in Task G4 by construction, but verify:

- [ ] **Step 1: Grep**

```bash
grep -rn "devResetProgress" src/ app/ --include="*.ts" --include="*.tsx"
```

Expected: only the one definition in `useAuthStore.ts` (wrapped in `__DEV__`) and any debug menu call site. If a non-`__DEV__` call site exists in production code (e.g., a settings screen button), wrap THAT call site in `__DEV__` too.

- [ ] **Step 2: Commit if changes**

```bash
git commit -am "cleanup: confirm devResetProgress is __DEV__-only"
```

### Task K3: Type-check pass

- [ ] **Step 1: Run TypeScript strict check**

```bash
npx tsc --noEmit
```

Expected: zero errors. If errors exist, fix each one before moving to smoke tests.

- [ ] **Step 2: Commit any fixes**

```bash
git commit -am "fix(types): resolve remaining type errors after refactor"
```

---

## Group L — Smoke tests

The spec defines these as acceptance criteria. Each must be performed manually on a real device (iOS and Android) before the build is considered ready for staged rollout.

### Smoke test 1 — Cross-user contamination

- [ ] **Step 1**: Sign in as Pro user (Account A). Verify Pro UI visible (e.g. paywall absent, gem bundles unlocked).
- [ ] **Step 2**: Open the More screen → tap "Sign out". Wait for navigation to onboarding.
- [ ] **Step 3**: Sign in as a non-Pro user (Account B). Verify Pro UI **NOT** visible:
  - Paywalls appear where expected
  - `useIsPro()` returns false
  - No A-user data visible anywhere (xp/coins/gems are B's, not A's)
- [ ] **Step 4**: Inspect AsyncStorage via React Native debugger: verify no `subscription-storage`, `economy-store`, `chapter-store` keys remain.

PASS criteria: all four steps succeed without any Pro-state leakage.

### Smoke test 2 — Optimistic revert

- [ ] **Step 1**: Sign in. Note current XP.
- [ ] **Step 2**: Disable network (airplane mode).
- [ ] **Step 3**: Trigger an XP award (complete a lesson, etc.).
- [ ] **Step 4**: Observe: UI shows incremented XP immediately.
- [ ] **Step 5**: Wait for the mutation to fail (~10s timeout).
- [ ] **Step 6**: Observe: UI reverts to original XP. Optionally a toast/error appears.
- [ ] **Step 7**: Re-enable network. Repeat the action. Observe: UI shows incremented XP and persists after refresh.

PASS criteria: revert happens cleanly; no stale optimistic value lingers.

### Smoke test 3 — Token expiry → sign-out

- [ ] **Step 1**: Sign in. Verify everything works.
- [ ] **Step 2**: Manually corrupt the JWT in expo-secure-store via a debug script (or wait for natural expiry on a staging build with a 1-min token).
- [ ] **Step 3**: Trigger an API call (refresh a screen).
- [ ] **Step 4**: Observe: 401 → user navigated back to onboarding without crash.

PASS criteria: 401 produces sign-out, not a crash or stuck UI.

### Smoke test 4 — Backfill from legacy build

- [ ] **Step 1**: Install the **previous** build of the app (the broken one). Sign in. Earn some XP, complete some lessons, intentionally produce local-only state.
- [ ] **Step 2**: Without signing out, install the **new** build on the same device (test via Expo dev client or TestFlight).
- [ ] **Step 3**: Open the app. Observe: Daisy splash → app boots → user is still signed in → progress is preserved.
- [ ] **Step 4**: Inspect Neon DB: confirm `user_profiles` row for this user has the XP/coins from the legacy state, and `module_progress` has the completed modules.
- [ ] **Step 5**: Confirm `finplay_backfill_v1_done` flag in expo-secure-store is set.
- [ ] **Step 6**: Confirm legacy AsyncStorage keys (`economy-store`, `chapter-store`, `subscription-storage`) are gone.

PASS criteria: zero progress loss; backfill flag set; legacy keys wiped.

### Smoke test 5 — Backfill idempotency

- [ ] **Step 1**: Manually call `/api/migrate/backfill-v1` twice with the same payload via curl with a valid JWT.
- [ ] **Step 2**: Inspect `user_profiles`. Confirm no double-counting of XP/coins; values are identical to the first call.

PASS criteria: state is unchanged on the second call.

### Smoke test 6 — RC sign-out propagation

- [ ] **Step 1**: Sign in as Pro user A.
- [ ] **Step 2**: Open RevenueCat dashboard in a browser. Find user A's app-user-ID (the UUID, not the email). Confirm entitlement is active.
- [ ] **Step 3**: Sign out from the app.
- [ ] **Step 4**: Sign in as user B.
- [ ] **Step 5**: In RC dashboard, look for user B's UUID. Confirm it is a different ID and has no Pro entitlement.

PASS criteria: each user has a distinct RC identity; entitlements don't leak.

---

## Self-review

Spec coverage:

| Spec section | Plan task(s) |
|---|---|
| § Identity / JWT / withAuth | A1–A8 |
| § preferences JSONB column | A9 |
| § Source of truth resources table | F1–F6 |
| § Optimistic update pattern | F2 (and same shape in F1/F5) |
| § Delta endpoints (no Aviv-class loss) | B1 (economy uses SQL deltas), A8 (profile rejects numeric writes) |
| § Refetch policy (30s / 5min / foreground / reconnect) | D2 staleTime, J1 foreground, J2 reconnect |
| § Bin B contract (`reset`, registry) | E2 (registry), G4 (auth), I7 (every Bin B store) |
| § Sign-in flow | G2 (lifecycle.signInWithProfile), G4 (LoginScreen wiring), G6 (ProfileBootScreen) |
| § Sign-out flow | G2 (lifecycle.signOut), G4 (MoreScreen wiring) |
| § App-start flow | G2 (lifecycle.bootFromToken), G5 (_layout wiring) |
| § RevenueCat fixes | G1 (re-configure), G2 (await logIn/logOut in correct order) — with spec deviation note above |
| § Backfill (algorithm, idempotency, retry-on-fail) | C1/C2 (merge logic), C3 (endpoint), H1/H2 (legacy reader), H3 (orchestrator) |
| § Legacy keys constant | H3 LEGACY_KEYS_V0 |
| § Schema additions | A9 (preferences), B4 (user_stats) |
| § Cleanup of legacy code | K1 (DEV_PRO_EMAILS), K2 (devResetProgress), G4 (slim auth store), G3 (401 handler), task removing `_layout.tsx` lines 235–246 in D3 |
| § Smoke tests | L (all six) |
| § Rollout strategy (kill switch, retry-on-fail) | C3 (BACKFILL_V1_ENABLED check), H3 (don't markDone on failure) |
| § Observability events | Not implemented yet — see "Known plan gap" below |
| § ProfileBootScreen UX | G6 |

**Known plan gap — observability events:** The spec defines a captureEvent list (backfill_started/succeeded/failed, sign_out_*, rc_*, auth_token_invalid, hydration_failed). The plan does not include explicit captureEvent calls. Resolution: weave `captureEvent` into the lifecycle / api-client / backfill files during the corresponding tasks. To make this concrete: in `lifecycle.ts` (G2) wrap the sign-in/sign-out/backfill paths with captureEvent calls per the spec's table; in `api/client.ts` (E3) call captureEvent on 401. This is added as Task K3.5 below.

### Task K3.5: Wire captureEvent calls per spec observability table

**Files:**
- Modify: `src/lib/auth/lifecycle.ts`
- Modify: `src/lib/auth/backfill.ts`
- Modify: `src/lib/api/client.ts`

- [ ] **Step 1: Import captureEvent in each file**

```ts
import { captureEvent } from '../../analytics'; // adjust path to match existing analytics helper
```

(The existing codebase uses `captureEvent` somewhere; locate it via `grep -rn "captureEvent" src/`. If it doesn't exist as expected, fall back to `import analytics from '@react-native-firebase/analytics'; analytics().logEvent(name, props);`.)

- [ ] **Step 2: Add events in `lifecycle.ts`**

```ts
// In signInWithProfile, around the backfill block:
captureEvent('backfill_started', { hasProfile: !!local.profile, moduleCount: local.modules?.length ?? 0 });
try {
  await runBackfillV1();
  await backfillFlag.markDone();
  captureEvent('backfill_succeeded', { durationMs: Date.now() - startedAt });
} catch (e) {
  captureEvent('backfill_failed', { reason: String(e) });
}

// In signOut, at the end of try blocks:
captureEvent('sign_out_completed', {});

// On RC login success/failure: wrap loginRevenueCat with captureEvent calls.
```

- [ ] **Step 3: Add event in `api/client.ts`**

Inside the 401 path:

```ts
captureEvent('auth_token_invalid', { endpoint: path });
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/lifecycle.ts src/lib/auth/backfill.ts src/lib/api/client.ts
git commit -m "feat(analytics): wire captureEvent for backfill, sign-out, 401 per spec"
```

Placeholder scan: no TBDs or "implement later". All code blocks contain runnable code or step-by-step procedures. Type consistency: `ProfileRow`, `Economy`, `StreakState`, `SubscriptionState`, `ModuleProgressRow`, `UserStatsRow` are defined once each and referenced consistently. `queryClient` is a singleton from `src/lib/queryClient.ts` imported everywhere. `useAuthStore` actions: `signIn`, `clear`, `reset` all defined consistently in Task G4 and referenced from lifecycle.

---

## Execution

**Plan complete and saved to `docs/superpowers/plans/2026-05-21-data-persistence-p0.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for a plan this large — each subagent gets focused context for one task instead of the entire 200+ step document.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Higher risk of context bloat over a multi-day implementation, but simpler if you want everything visible in one place.

**Which approach?**
