# Identity Model Unification — One UUID Across the App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `user_profiles.id` (uuid) the single identity every part of the app joins on; let Google/Apple/email resolve *to* it (multi-provider linking); re-key the email-keyed tables to the uuid; and fix Apple Sign-In in the live backend along the way.

**Architecture:** Postgres (Neon) + Drizzle ORM. The **live** backend is the Vercel `api/` serverless functions authed by JWT (`withAuth`); the JWT already carries the uuid as `sub` (→ `ctx.userId`). The Expo Router `app/api/**+api.ts` routes are **not deployed** and are out of scope. Migrations are hand-written idempotent SQL files in `src/db/migrations/`, applied by `scripts/migrate-local.mjs` (which hardcodes the file list). Rollout is three production-safe phases: additive schema → code switch → cleanup.

**Tech Stack:** TypeScript (strict), Drizzle ORM, `@neondatabase/serverless`, `jsonwebtoken`, Vercel functions, Expo/React Native client.

**Source spec:** [`../specs/2026-05-31-identity-uuid-unification-design.md`](../specs/2026-05-31-identity-uuid-unification-design.md) (read its "Production-reality addendum" first).

---

## Testing reality (read before starting)

This repo has **no unit-test framework** (the only `*.test.ts` files are in `node_modules`; `package.json` exposes only `typecheck`). Verification in every task therefore uses:

1. **`npm run typecheck`** — `tsc --noEmit`. Must stay green after every code change.
2. **SQL verification queries** — run against a **Neon test branch** (never production). Use the helper below, not a guess.
3. **`curl` smoke tests** — against local `vercel dev` (`npm run dev:local` serves `api/` on `http://localhost:5050`). See memory [[local_testing]] for the dev-branch/CORS/Google gotchas.
4. **Manual smoke tests** — the scenarios in the spec's "Testing & smoke tests" section.

**SQL helper** (used by verification steps). Create it once, in Task 0:

```bash
# scripts/sql.mjs — run ad-hoc SQL against DATABASE_URL in .env.local (TEST BRANCH ONLY)
# usage: node scripts/sql.mjs "SELECT count(*) FROM user_profiles"
```

**Do NOT run any verification SQL against the production database.** Confirm `.env.local`'s `DATABASE_URL` host is a test branch before each SQL step.

---

## File map

**Create:**
- `scripts/sql.mjs` — ad-hoc SQL runner for verification (Task 0).
- `src/db/migrations/0003_identity_additive.sql` — Phase A schema (additive).
- `src/db/migrations/0004_identity_rekey_constraints.sql` — Phase C constraints/cleanup.
- `api/auth/link.ts` — authenticated "connect another provider" endpoint (Phase B).

**Modify:**
- `scripts/migrate-local.mjs` — register the two new migration files.
- `src/db/schema.ts` — add `googleSub`/`appleSub`/`emailVerified` to `userProfiles`; add `userId` to `coinEvents`/`dividendCollections`/`referrals`.
- `api/auth/verify.ts` — Apple branch + provider-subject resolution + linking + create.
- `api/sync/economy.ts`, `api/sync/profile.ts`, `api/sync/subscription.ts` — key by `ctx.userId`.
- `api/migrate/backfill-v1.ts` — key by `ctx.userId`.
- `api/sync/progress.ts` — drop `resolveUserId`, use `ctx.userId`.
- `src/lib/api/auth.ts` — add `linkProvider()` client function (Phase B).
- `app/(tabs)/settings.tsx` — "Connected accounts" UI calling `linkProvider()`.

**Unchanged (verify only):** `api/_shared/jwt.ts`, `api/_shared/withAuth.ts`, `api/sync/user-stats.ts` (already `ctx.userId`), `src/features/auth/useAppleAuth.ts` / `useGoogleAuth.ts` (already post `provider:'apple'`/`'google'`).

---

## Task 0: SQL verification helper

**Files:**
- Create: `scripts/sql.mjs`

- [ ] **Step 1: Write the helper**

```js
// scripts/sql.mjs
// Ad-hoc SQL runner for verification against the TEST-BRANCH DATABASE_URL in .env.local.
// usage: node scripts/sql.mjs "SELECT count(*) FROM user_profiles"
import fs from 'node:fs';

const query = process.argv[2];
if (!query) { console.error('usage: node scripts/sql.mjs "<SQL>"'); process.exit(1); }

let raw = '';
try { raw = fs.readFileSync('.env.local', 'utf8'); } catch { console.error('No .env.local'); process.exit(1); }
const url = (raw.match(/^DATABASE_URL=(.*)$/m)?.[1] ?? '').trim();
if (!url) { console.error('DATABASE_URL not set in .env.local'); process.exit(1); }

const host = url.match(/@([^/?]+)/)?.[1] ?? '(unparsed)';
console.log(`[sql] host=${host}`);
const { neon } = await import('@neondatabase/serverless');
const sql = neon(url);
const rows = await sql.query(query);
console.log(JSON.stringify(rows, null, 2));
```

- [ ] **Step 2: Verify it runs**

Run: `node scripts/sql.mjs "SELECT count(*)::int AS n FROM user_profiles"`
Expected: prints the host line and a JSON array like `[ { "n": <number> } ]`. If it errors on connection, fix `.env.local` before continuing.

- [ ] **Step 3: Commit**

```bash
git add scripts/sql.mjs
git commit -m "chore(db): add ad-hoc SQL verification helper for migrations"
```

---

# PHASE A — Additive schema (no behavior change, fully reversible)

Goal: add the new columns and the `user_id` shadow columns, backfill them, add indexes. Existing code still reads `auth_id` and is unaffected.

## Task A1: Write the additive migration SQL

**Files:**
- Create: `src/db/migrations/0003_identity_additive.sql`

- [ ] **Step 1: Write the migration (idempotent)**

```sql
-- Migration 0003: identity unification — additive phase.
-- Idempotent: every statement uses IF NOT EXISTS / guarded DO blocks.
-- Safe to run repeatedly. Touches no existing row values except backfilling
-- the new nullable user_id columns from the existing auth_id join.

-- NOTE: every statement is single (no DO $$ blocks) and ends with one ';' with
-- NO internal semicolons, because scripts/migrate-local.mjs splits files on ';'.
-- Nullable uniqueness is enforced via CREATE UNIQUE INDEX IF NOT EXISTS (a
-- partial-free unique index permits multiple NULLs, same as a UNIQUE constraint)
-- which IS idempotent — unlike ADD CONSTRAINT UNIQUE, which is not.

-- 1. user_profiles: provider-subject columns + email_verified.
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "google_sub" text;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "apple_sub" text;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_google_sub_key" ON "user_profiles" ("google_sub");
CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_apple_sub_key" ON "user_profiles" ("apple_sub");

-- 2. coin_events: add user_id, backfill from auth_id join.
ALTER TABLE "coin_events" ADD COLUMN IF NOT EXISTS "user_id" uuid;
UPDATE "coin_events" c SET "user_id" = p."id"
  FROM "user_profiles" p WHERE p."auth_id" = c."auth_id" AND c."user_id" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_coin_events_user_date2" ON "coin_events" ("user_id", "granted_at");

-- 3. dividend_collections: add user_id, backfill.
ALTER TABLE "dividend_collections" ADD COLUMN IF NOT EXISTS "user_id" uuid;
UPDATE "dividend_collections" d SET "user_id" = p."id"
  FROM "user_profiles" p WHERE p."auth_id" = d."auth_id" AND d."user_id" IS NULL;

-- 4. referrals: add referee_user_id + referrer_user_id, backfill both.
ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "referee_user_id" uuid;
ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "referrer_user_id" uuid;
UPDATE "referrals" r SET "referee_user_id" = p."id"
  FROM "user_profiles" p WHERE p."auth_id" = r."referee_auth_id" AND r."referee_user_id" IS NULL;
UPDATE "referrals" r SET "referrer_user_id" = p."id"
  FROM "user_profiles" p WHERE p."auth_id" = r."referrer_auth_id" AND r."referrer_user_id" IS NULL;
CREATE INDEX IF NOT EXISTS "idx_referrals_referrer_uid" ON "referrals" ("referrer_user_id");
```

- [ ] **Step 2: Register the file in the migration runner**

In `scripts/migrate-local.mjs`, extend the `migrationFiles` array:

```js
const migrationFiles = [
  'src/db/migrations/0001_add_preferences.sql',
  'src/db/migrations/0002_add_user_stats.sql',
  'src/db/migrations/0003_identity_additive.sql',
];
```

- [ ] **Step 3: Apply to the test branch**

Run: `npm run db:migrate:local`
Expected: ends with `applied: src/db/migrations/0003_identity_additive.sql` then `schema ready.`

- [ ] **Step 4: Verify columns exist and backfill is complete**

Run:
```bash
node scripts/sql.mjs "SELECT column_name FROM information_schema.columns WHERE table_name='user_profiles' AND column_name IN ('google_sub','apple_sub','email_verified') ORDER BY 1"
node scripts/sql.mjs "SELECT (SELECT count(*) FROM coin_events WHERE user_id IS NULL AND auth_id IS NOT NULL) AS coin_orphans, (SELECT count(*) FROM dividend_collections WHERE user_id IS NULL) AS div_orphans, (SELECT count(*) FROM referrals WHERE referee_user_id IS NULL OR referrer_user_id IS NULL) AS ref_orphans"
```
Expected: first query lists all three column names; second query shows `coin_orphans`, `div_orphans`, `ref_orphans`. **Any non-zero count = pre-existing rows whose `auth_id` has no matching profile.** Record the counts; these rows are left for manual review (do not delete). They block adding `NOT NULL` in Phase C, handled there.

- [ ] **Step 5: Re-run to prove idempotency**

Run: `npm run db:migrate:local`
Expected: succeeds again with no errors (all statements are guarded).

- [ ] **Step 6: Commit**

```bash
git add src/db/migrations/0003_identity_additive.sql scripts/migrate-local.mjs
git commit -m "feat(db): phase A — additive identity columns + user_id backfill"
```

## Task A2: Reflect the additive schema in Drizzle

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add the new `user_profiles` columns**

In `src/db/schema.ts`, inside the `userProfiles` `pgTable` column object, after the `preferences` line add:

```ts
	googleSub: text("google_sub"),
	appleSub: text("apple_sub"),
	emailVerified: boolean("email_verified").default(false),
```

And in the `userProfiles` constraints array (the `(table) => [ ... ]` block), after the existing `unique(...)` lines add:

```ts
	uniqueIndex("user_profiles_google_sub_key").on(table.googleSub),
	uniqueIndex("user_profiles_apple_sub_key").on(table.appleSub),
```

(Use `uniqueIndex`, not `unique`, to mirror the DB exactly — Task A1 creates these as unique *indexes*, not constraints. Add `uniqueIndex` to the existing `drizzle-orm/pg-core` import at the top of `schema.ts` if it isn't already imported. This metadata doesn't affect runtime query building; it documents intent and keeps any future `drizzle-kit introspect` consistent.)

- [ ] **Step 2: Add `userId` to the three re-keyed tables**

In `coinEvents` column object, add:

```ts
	userId: uuid("user_id"),
```

In `dividendCollections` column object, add:

```ts
	userId: uuid("user_id"),
```

In `referrals` column object, add:

```ts
	refereeUserId: uuid("referee_user_id"),
	referrerUserId: uuid("referrer_user_id"),
```

(These stay nullable / un-FK'd in Drizzle until Phase C, matching the DB.)

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors). The new fields are additive; existing code keeps compiling.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(db): reflect phase-A identity columns in drizzle schema"
```

---

# PHASE B — Code switch (behavior change; staged rollout)

Goal: the live backend resolves identity by the uuid, the login path supports Google/Apple/email with linking, Apple Sign-In works again, and users can connect a second provider from Settings.

## Task B1: Switch the simple sync endpoints to `ctx.userId`

**Files:**
- Modify: `api/sync/economy.ts`, `api/sync/profile.ts`, `api/sync/subscription.ts`, `api/migrate/backfill-v1.ts`

- [ ] **Step 1: economy.ts**

In `api/sync/economy.ts`, replace **both** occurrences of:

```ts
      .where(eq(userProfiles.authId, ctx.authId))
```

with:

```ts
      .where(eq(userProfiles.id, ctx.userId))
```

(There are two: the GET select and the POST re-select. The `.update(...).where(eq(userProfiles.authId, ctx.authId))` in between must also change to `eq(userProfiles.id, ctx.userId)` — change **all three** `where` clauses in the file.)

- [ ] **Step 2: profile.ts**

In `api/sync/profile.ts`, change all three `where(eq(userProfiles.authId, ctx.authId))` clauses (GET select, POST update, POST re-select) to `where(eq(userProfiles.id, ctx.userId))`.

- [ ] **Step 3: subscription.ts**

In `api/sync/subscription.ts`, change all three `where(eq(userProfiles.authId, ctx.authId))` clauses to `where(eq(userProfiles.id, ctx.userId))`.

- [ ] **Step 4: backfill-v1.ts**

In `api/migrate/backfill-v1.ts`, change all `where(eq(userProfiles.authId, ctx.authId))` clauses (the initial profile select, the update, and the final profile re-select) to `where(eq(userProfiles.id, ctx.userId))`. Leave the `moduleProgress` queries unchanged (already keyed by `profileRow.id`).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS. `ctx.userId` is already `string` on `AuthContext`.

- [ ] **Step 6: Smoke test against local dev**

Start local dev (`npm run dev:local`), obtain a JWT for a test user (sign in via the web app, or mint one with a node snippet using `AUTH_JWT_SECRET` + an existing `user_profiles.id`). Then:

```bash
curl -s "http://localhost:5050/api/sync/economy" -H "Authorization: Bearer <JWT>"
```
Expected: `{"ok":true,"economy":{...}}` for the user whose `id` is the JWT `sub` — i.e. the same data as before the change. A `null` economy where data was expected means the `sub`→row lookup failed; recheck the JWT's `sub` matches a real `user_profiles.id`.

- [ ] **Step 7: Commit**

```bash
git add api/sync/economy.ts api/sync/profile.ts api/sync/subscription.ts api/migrate/backfill-v1.ts
git commit -m "feat(api): key economy/profile/subscription/backfill by ctx.userId (uuid)"
```

## Task B2: Simplify progress.ts to use `ctx.userId` directly

**Files:**
- Modify: `api/sync/progress.ts`

- [ ] **Step 1: Remove the email→uuid shim**

In `api/sync/progress.ts`, delete the `resolveUserId` function (lines defining `async function resolveUserId(...)`) and its `userProfiles` import if it becomes unused. Replace the handler body's resolution:

```ts
export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  const db = getDb();
  const userId = ctx.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }
  // ... rest unchanged (GET select, POST upsert) — they already use `userId`
});
```

Remove the now-unused `userProfiles` and `eq(userProfiles...)`-only imports **only if** nothing else in the file references them (the `moduleProgress` import stays).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. If it fails on an unused import, remove the specific unused symbol.

- [ ] **Step 3: Smoke test**

```bash
curl -s "http://localhost:5050/api/sync/progress" -H "Authorization: Bearer <JWT>"
```
Expected: `{"ok":true,"progress":[...]}` matching the user's existing module progress.

- [ ] **Step 4: Commit**

```bash
git add api/sync/progress.ts
git commit -m "refactor(api): progress uses ctx.userId directly, drop resolveUserId shim"
```

## Task B3: Rewrite `api/auth/verify.ts` — providers, subjects, linking, Apple

**Files:**
- Modify: `api/auth/verify.ts`

This is the core task. The handler resolves a credential to `(provider, subject, email, emailVerified)`, finds-or-links-or-creates a single `user_profiles` row, and mints the JWT. Apple is added (fixes the live outage). `auth_id` is still written (kept until Phase C) so the legacy email-login path and the `NOT NULL` constraint keep working.

> **Intentional deviation from the spec's algorithm comment:** the spec wrote the auto-link guard as "incoming `email_verified` AND an existing user with that email *whose own `email_verified = true`*". The plan relaxes the second clause — it links when the **incoming** credential is verified and *any* row has that email, regardless of that row's stored `email_verified`. This is required for **lazy backfill**: existing production rows have `email_verified = false` (the column default) even though their email was originally established by a verified Google/Apple login, so the stricter guard would never link them. Relaxing it is safe because safety comes from the *incoming* credential being provider-verified (the user provably controls the address); the stored flag is irrelevant.

- [ ] **Step 1: Replace the handler with the linking implementation**

Replace the entire body of `api/auth/verify.ts` with:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../src/db/schema';
import { sendWelcomeEmail } from '../_shared/sendWelcomeEmail';
import { signSession } from '../_shared/jwt';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  return drizzle(neon(url));
}

interface VerifyRequestBody {
  provider: 'google' | 'email' | 'apple';
  token?: string;        // google access_token or id_token
  email?: string;        // email provider, or Apple's first-login email
  appleUserId?: string;  // Apple stable subject (credential.user)
  displayName?: string;
}

interface ResolvedCredential {
  provider: 'google' | 'email' | 'apple';
  subject: string;       // google sub | apple sub | email (for email provider)
  email: string | null;  // deliverable email if known
  emailVerified: boolean; // true only for provider-verified emails (google/apple)
  displayName: string | null;
}

function isEmail(s: string | null | undefined): s is string {
  return !!s && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) && s.length <= 254;
}

async function resolveGoogle(token: string): Promise<ResolvedCredential | null> {
  const isJwt = (token.match(/\./g) ?? []).length === 2;
  if (isJwt) {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
    if (!r.ok) return null;
    const info = (await r.json()) as { sub?: string; email?: string; name?: string };
    if (!info.sub) return null;
    return { provider: 'google', subject: info.sub, email: info.email ?? null, emailVerified: true, displayName: info.name ?? null };
  }
  const r = await fetch('https://www.googleapis.com/userinfo/v2/me', { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const info = (await r.json()) as { id?: string; email?: string; name?: string };
  if (!info.id) return null;
  return { provider: 'google', subject: info.id, email: info.email ?? null, emailVerified: true, displayName: info.name ?? null };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body as VerifyRequestBody;
    let cred: ResolvedCredential | null = null;

    if (body.provider === 'google') {
      if (!body.token) return res.status(400).json({ error: 'Missing Google token' });
      cred = await resolveGoogle(body.token);
      if (!cred) return res.status(401).json({ error: 'Invalid Google token' });
    } else if (body.provider === 'apple') {
      // Trust the native Apple credential subject (matches prior app/api behavior).
      if (!body.appleUserId) return res.status(400).json({ error: 'Missing Apple identifier' });
      cred = {
        provider: 'apple',
        subject: body.appleUserId,
        email: isEmail(body.email) ? body.email : null,
        emailVerified: true, // Apple verifies the address it returns
        displayName: body.displayName ?? null,
      };
    } else if (body.provider === 'email') {
      if (!isEmail(body.email)) return res.status(400).json({ error: 'Invalid email' });
      cred = {
        provider: 'email',
        subject: body.email,
        email: body.email,
        emailVerified: false, // passwordless — NOT a verified address (see spec security note)
        displayName: body.displayName ?? null,
      };
    } else {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    const db = getDb();

    // 1. Find by provider subject.
    let row =
      cred.provider === 'google'
        ? (await db.select().from(userProfiles).where(eq(userProfiles.googleSub, cred.subject)).limit(1))[0]
        : cred.provider === 'apple'
        ? (await db.select().from(userProfiles).where(eq(userProfiles.appleSub, cred.subject)).limit(1))[0]
        : (await db.select().from(userProfiles).where(eq(userProfiles.email, cred.subject)).limit(1))[0];

    // 2. Auto-link: a verified credential whose email matches an existing row
    //    attaches its subject to that row. Safe because the provider proved the
    //    user controls the address. Unverified (email-provider) logins skip this.
    if (!row && cred.emailVerified && isEmail(cred.email)) {
      const byEmail = (await db.select().from(userProfiles).where(eq(userProfiles.email, cred.email)).limit(1))[0];
      if (byEmail) {
        await db.update(userProfiles).set({
          googleSub: cred.provider === 'google' ? cred.subject : byEmail.googleSub,
          appleSub: cred.provider === 'apple' ? cred.subject : byEmail.appleSub,
          emailVerified: true,
          displayName: byEmail.displayName ?? cred.displayName ?? undefined,
          updatedAt: new Date().toISOString(),
        }).where(eq(userProfiles.id, byEmail.id));
        row = (await db.select().from(userProfiles).where(eq(userProfiles.id, byEmail.id)).limit(1))[0];
      }
    }

    // 3. Create. authId stays populated (NOT NULL + legacy email-login path):
    //    use the email when present, else the provider subject (stable, unique).
    if (!row) {
      const authId = isEmail(cred.email) ? cred.email : cred.subject;
      await db.insert(userProfiles).values({
        authId,
        email: isEmail(cred.email) ? cred.email : null,
        emailVerified: cred.emailVerified,
        displayName: cred.displayName,
        googleSub: cred.provider === 'google' ? cred.subject : null,
        appleSub: cred.provider === 'apple' ? cred.subject : null,
      });
      row = (await db.select().from(userProfiles).where(eq(userProfiles.authId, authId)).limit(1))[0];
    } else if (cred.provider === 'email' && cred.displayName && !row.displayName) {
      // Returning email login that supplied a name we didn't have.
      await db.update(userProfiles).set({ displayName: cred.displayName, updatedAt: new Date().toISOString() }).where(eq(userProfiles.id, row.id));
      row = (await db.select().from(userProfiles).where(eq(userProfiles.id, row.id)).limit(1))[0];
    }

    if (!row) return res.status(500).json({ error: 'Profile lookup failed after upsert' });

    if (!row.welcomeEmailSent && isEmail(row.email)) {
      await sendWelcomeEmail({ db, userId: row.id, email: row.email, displayName: row.displayName });
    }

    const token = signSession({ sub: row.id, authId: row.authId });
    return res.status(200).json({ ok: true, profile: row, token });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Smoke test — email create + returning**

Against local dev:
```bash
curl -s -X POST "http://localhost:5050/api/auth/verify" -H "Content-Type: application/json" -d '{"provider":"email","email":"plan-test@example.com","displayName":"Plan Test"}'
```
Expected: `{"ok":true,"profile":{...,"id":"<uuid>","email":"plan-test@example.com"},"token":"<jwt>"}`. Run the same command again → same `id` returned (no duplicate). Verify:
```bash
node scripts/sql.mjs "SELECT count(*)::int AS n FROM user_profiles WHERE email='plan-test@example.com'"
```
Expected: `n = 1`.

- [ ] **Step 4: Smoke test — Apple no longer 400s**

```bash
curl -s -X POST "http://localhost:5050/api/auth/verify" -H "Content-Type: application/json" -d '{"provider":"apple","appleUserId":"000123.fakeapplesub.0001","email":"plan-test@example.com","displayName":"Plan Test"}'
```
Expected: `{"ok":true,...}` and — because `plan-test@example.com` already exists with a verified credential is not required here; the incoming Apple email is verified — the Apple sub **auto-links to the existing row** (same `id` as Step 3). Verify:
```bash
node scripts/sql.mjs "SELECT id, google_sub, apple_sub FROM user_profiles WHERE email='plan-test@example.com'"
```
Expected: one row, `apple_sub = '000123.fakeapplesub.0001'`, still a single `id`.

- [ ] **Step 5: Smoke test — Apple hidden-email creates its own account**

```bash
curl -s -X POST "http://localhost:5050/api/auth/verify" -H "Content-Type: application/json" -d '{"provider":"apple","appleUserId":"000999.hiddenrelaysub.0009","displayName":"Hidden User"}'
```
Expected: a **new** `id` (no email to link on), `apple_sub='000999.hiddenrelaysub.0009'`, `email IS NULL`. Re-running returns the same `id` (found by `apple_sub`).

- [ ] **Step 6: Clean up test rows**

```bash
node scripts/sql.mjs "DELETE FROM user_profiles WHERE email='plan-test@example.com' OR apple_sub='000999.hiddenrelaysub.0009'"
```

- [ ] **Step 7: Commit**

```bash
git add api/auth/verify.ts
git commit -m "feat(auth): verify resolves google_sub/apple_sub + auto-link + Apple support"
```

## Task B4: Authenticated "connect another provider" endpoint

**Files:**
- Create: `api/auth/link.ts`

Lets a signed-in user attach a second provider to their existing uuid (the catch-all for Apple Hide-My-Email that can't auto-link by email).

- [ ] **Step 1: Write the endpoint**

```ts
// api/auth/link.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { userProfiles } from '../../src/db/schema';
import { getDb } from '../_shared/db';
import { withAuth } from '../_shared/withAuth';

interface LinkBody {
  provider: 'google' | 'apple';
  token?: string;        // google token
  appleUserId?: string;  // apple subject
}

export default withAuth(async (req: VercelRequest, res: VercelResponse, ctx) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = (req.body ?? {}) as LinkBody;
  const db = getDb();

  let subject: string | null = null;
  if (body.provider === 'google') {
    if (!body.token) return res.status(400).json({ error: 'Missing Google token' });
    const isJwt = (body.token.match(/\./g) ?? []).length === 2;
    if (isJwt) {
      const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.token)}`);
      if (!r.ok) return res.status(401).json({ error: 'Invalid Google token' });
      subject = ((await r.json()) as { sub?: string }).sub ?? null;
    } else {
      const r = await fetch('https://www.googleapis.com/userinfo/v2/me', { headers: { Authorization: `Bearer ${body.token}` } });
      if (!r.ok) return res.status(401).json({ error: 'Invalid Google token' });
      subject = ((await r.json()) as { id?: string }).id ?? null;
    }
  } else if (body.provider === 'apple') {
    if (!body.appleUserId) return res.status(400).json({ error: 'Missing Apple identifier' });
    subject = body.appleUserId;
  } else {
    return res.status(400).json({ error: 'Unsupported provider' });
  }
  if (!subject) return res.status(401).json({ error: 'Could not resolve provider subject' });

  // Reject if this subject already belongs to a DIFFERENT user.
  const col = body.provider === 'google' ? userProfiles.googleSub : userProfiles.appleSub;
  const existing = (await db.select({ id: userProfiles.id }).from(userProfiles).where(eq(col, subject)).limit(1))[0];
  if (existing && existing.id !== ctx.userId) {
    return res.status(409).json({ error: 'This account is already linked to another user' });
  }

  await db.update(userProfiles).set({
    googleSub: body.provider === 'google' ? subject : undefined,
    appleSub: body.provider === 'apple' ? subject : undefined,
    updatedAt: new Date().toISOString(),
  }).where(eq(userProfiles.id, ctx.userId));

  const row = (await db.select().from(userProfiles).where(eq(userProfiles.id, ctx.userId)).limit(1))[0];
  return res.status(200).json({ ok: true, profile: row ?? null });
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Smoke test — link + conflict**

With a valid JWT for an existing user:
```bash
curl -s -X POST "http://localhost:5050/api/auth/link" -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" -d '{"provider":"apple","appleUserId":"000777.linktest.0007"}'
```
Expected: `{"ok":true,"profile":{...,"apple_sub":"000777.linktest.0007"}}`. Run the same with a **different** user's JWT and the same `appleUserId` → `409 {"error":"This account is already linked to another user"}`. Clean up: `node scripts/sql.mjs "UPDATE user_profiles SET apple_sub=NULL WHERE apple_sub='000777.linktest.0007'"`.

- [ ] **Step 4: Commit**

```bash
git add api/auth/link.ts
git commit -m "feat(auth): authenticated provider-link endpoint for connecting accounts"
```

## Task B5: Client — `linkProvider()` + Settings "Connected accounts" UI

**Files:**
- Modify: `src/lib/api/auth.ts`, `app/(tabs)/settings.tsx`

- [ ] **Step 1: Add the client API function**

In `src/lib/api/auth.ts`, append:

```ts
/** Attach a second login provider to the currently-signed-in account. */
export function linkProvider(
  params: { provider: 'apple'; appleUserId: string } | { provider: 'google'; token: string },
) {
  return api.post<typeof params, { ok: true; profile: ProfileRow }>('/api/auth/link', params);
}
```

- [ ] **Step 2: Read the Settings screen to find the insertion point**

Run: open `app/(tabs)/settings.tsx`. Locate the account/sign-out section (the row group that renders sign-out / delete-account). The "Connected accounts" controls go in that group.

- [ ] **Step 3: Add the Connect controls**

In `app/(tabs)/settings.tsx`, within the account section, add (matching the file's existing component/translation patterns — use NativeWind classes already used in that file, and Hebrew copy per `docs/BRAND.md`):

```tsx
// Near other hooks at the top of the component:
const { promptAppleSignIn, isAvailable: appleAvailable } = useAppleAuth();
// Connect Apple: reuse the native credential flow, then POST to /api/auth/link.
// NOTE: useAppleAuth currently SIGNS IN. For linking, add a `mode: 'link'`
// option to useAppleAuth (Step 4) so the same native sheet calls linkProvider
// instead of signInWithProfile when already authenticated.
```

Because the existing `useAppleAuth`/`useGoogleAuth` hooks hard-wire `signInWithProfile`, the clean approach is Step 4.

- [ ] **Step 4: Add a `link` mode to the auth hooks**

In `src/features/auth/useAppleAuth.ts`, after obtaining `credential.user` (the Apple subject), branch on whether a session token already exists:

```ts
import { tokenStore } from '../../lib/auth/secureStore';
import { linkProvider } from '../../lib/api/auth';
// ...
const alreadySignedIn = !!(await tokenStore.get());
if (alreadySignedIn) {
  try {
    await linkProvider({ provider: 'apple', appleUserId: credential.user });
    useAuthStore.getState().setAuthError(null);
  } catch {
    useAuthStore.getState().setAuthError('קישור החשבון נכשל. נסו שוב.');
  }
  return; // do NOT run the sign-in path when linking
}
// ... existing sign-in path unchanged
```

Apply the equivalent guard in `useGoogleAuth.ts`'s `fetchUserInfo` (call `linkProvider({ provider:'google', token })` when `alreadySignedIn`, then return before `signInWithProfile`).

- [ ] **Step 5: Wire the Settings buttons**

In `app/(tabs)/settings.tsx`, render "חבר חשבון Apple" (iOS only, when `appleAvailable`) and "חבר חשבון Google" buttons that call `promptAppleSignIn()` / the Google prompt. Because the user is already signed in, the hooks now take the link branch.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Manual smoke test (device/simulator)**

Sign in with email, go to Settings, tap "חבר חשבון Apple", complete the Apple sheet. Verify via `node scripts/sql.mjs "SELECT email, apple_sub FROM user_profiles WHERE id='<your uuid>'"` that `apple_sub` is now set on the same row.

- [ ] **Step 8: Commit**

```bash
git add src/lib/api/auth.ts src/features/auth/useAppleAuth.ts src/features/auth/useGoogleAuth.ts "app/(tabs)/settings.tsx"
git commit -m "feat(auth): Settings connect-account flow (link Apple/Google to current uuid)"
```

---

# PHASE C — Cleanup (only after Phase B is proven healthy in production)

Goal: enforce the new keys with constraints and remove the dead `auth_id` plumbing. **Gate:** do not start until the new build has been live with healthy metrics for ~1–2 weeks (per spec) and the orphan counts from Task A1 Step 4 are resolved or accepted.

## Task C1: Constraints, FKs, cascade, and column drops

**Files:**
- Create: `src/db/migrations/0004_identity_rekey_constraints.sql`
- Modify: `scripts/migrate-local.mjs`

- [ ] **Step 1: Pre-flight orphan check (must be clean)**

Run:
```bash
node scripts/sql.mjs "SELECT (SELECT count(*) FROM coin_events WHERE user_id IS NULL) AS c, (SELECT count(*) FROM dividend_collections WHERE user_id IS NULL) AS d, (SELECT count(*) FROM referrals WHERE referee_user_id IS NULL OR referrer_user_id IS NULL) AS r"
```
Expected: `c=0, d=0, r=0`. **If any are non-zero, STOP** — adding `NOT NULL` will fail. Resolve (delete or manually map) those rows first, then continue.

- [ ] **Step 2: Write the constraints migration**

```sql
-- Migration 0004: identity unification — constraints/cleanup phase.
-- Run ONLY after phase B is proven and orphan counts are zero.
-- No DO $$ blocks (the runner splits on ';'). Idempotency via the
-- DROP CONSTRAINT IF EXISTS → ADD CONSTRAINT pattern; SET NOT NULL and
-- DROP COLUMN IF EXISTS are naturally idempotent.

-- coin_events: enforce user_id, add FK+cascade, drop auth_id.
ALTER TABLE "coin_events" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "coin_events" DROP CONSTRAINT IF EXISTS "coin_events_user_fk";
ALTER TABLE "coin_events" ADD CONSTRAINT "coin_events_user_fk" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "coin_events" DROP COLUMN IF EXISTS "auth_id";

-- dividend_collections: new PK (user_id, date_collected), FK+cascade, drop auth_id.
ALTER TABLE "dividend_collections" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "dividend_collections" DROP CONSTRAINT IF EXISTS "dividend_collections_pkey";
ALTER TABLE "dividend_collections" ADD CONSTRAINT "dividend_collections_pkey" PRIMARY KEY ("user_id", "date_collected");
ALTER TABLE "dividend_collections" DROP CONSTRAINT IF EXISTS "dividend_collections_user_fk";
ALTER TABLE "dividend_collections" ADD CONSTRAINT "dividend_collections_user_fk" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "dividend_collections" DROP COLUMN IF EXISTS "auth_id";

-- referrals: drop the auth-id check first (it depends on the columns we drop),
-- new PK (referee_user_id), FKs+cascade, drop the *_auth_id columns, re-add check.
ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "referrals_check";
ALTER TABLE "referrals" ALTER COLUMN "referee_user_id" SET NOT NULL;
ALTER TABLE "referrals" ALTER COLUMN "referrer_user_id" SET NOT NULL;
ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "referrals_pkey";
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("referee_user_id");
ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "referrals_referee_fk";
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_fk" FOREIGN KEY ("referee_user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "referrals_referrer_fk";
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referee_auth_id";
ALTER TABLE "referrals" DROP COLUMN IF EXISTS "referrer_auth_id";
ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "referrals_uid_check";
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_uid_check" CHECK ("referrer_user_id" <> "referee_user_id");
```

- [ ] **Step 3: Register and apply**

Add `'src/db/migrations/0004_identity_rekey_constraints.sql'` to the `migrationFiles` array in `scripts/migrate-local.mjs`, then run `npm run db:migrate:local`.
Expected: ends with `applied: ...0004...` and `schema ready.`

- [ ] **Step 4: Verify constraints + cascade**

```bash
node scripts/sql.mjs "SELECT conname FROM pg_constraint WHERE conname IN ('coin_events_user_fk','dividend_collections_user_fk','referrals_referee_fk','referrals_referrer_fk') ORDER BY 1"
node scripts/sql.mjs "SELECT column_name FROM information_schema.columns WHERE table_name='coin_events' AND column_name='auth_id'"
```
Expected: first lists all four FK names; second returns an empty array (auth_id dropped).

- [ ] **Step 5: Update Drizzle schema to match**

In `src/db/schema.ts`: for `coinEvents` remove the `authId` column and the `auth_id`-based indexes, make `userId` `.notNull()`, and add the FK + a `(user_id, granted_at)` index. For `dividendCollections` remove `authId`, make `userId` `.notNull()`, change the `primaryKey` to `[table.userId, table.dateCollected]`, add the FK. For `referrals` remove `refereeAuthId`/`referrerAuthId` and the `referrals_check`, make the `*UserId` columns `.notNull()`, set `primaryKey` to `[table.refereeUserId]`, add both FKs and the `referrals_uid_check`. Then run `npm run typecheck` → Expected: PASS.

> **Dead-code caveat:** the undeployed `app/api/referral/*+api.ts` files reference these tables. Those that use raw `db.execute(sql\`...\`)` (e.g. `redeem+api.ts`) reference column names as **strings** and are not type-checked, so they won't break the build — but they are now stale (they name `referee_auth_id` etc.). If any referral file uses **Drizzle column refs** to the removed fields, `npm run typecheck` will fail here. Since referrals are out of scope and this code is dead in prod, the correct action is the minimal one to restore a green typecheck: either delete the dead `app/api/referral/*` files, or update their refs to the new columns. Do **not** expand scope into making referrals work — that's a separate effort.

- [ ] **Step 6: Commit**

```bash
git add src/db/migrations/0004_identity_rekey_constraints.sql scripts/migrate-local.mjs src/db/schema.ts
git commit -m "feat(db): phase C — NOT NULL + FK/cascade + drop auth_id on re-keyed tables"
```

## Task C2 (optional, final, separately gated): drop `user_profiles.auth_id`

**Files:**
- Create: `src/db/migrations/0005_drop_user_profiles_authid.sql` (+ register it)
- Modify: `api/_shared/jwt.ts` consumers if any still read `ctx.authId` against the column

`user_profiles.auth_id` is the original onConflict target, a NOT NULL UNIQUE column, and underpins the legacy email-login recovery (`lifecycle.bootFromToken` → `verifyEmail`). Dropping it is **not required** for the identity goal — `id` is already the universal key. Keep it as a harmless populated attribute unless there's a concrete reason to remove it.

- [ ] **Step 1: Confirm nothing reads the column**

Run: `grep -rn "authId\|auth_id" api/ src/lib src/features/auth | grep -vi "ctx.authId\|// " `
Decide for each hit whether it reads `userProfiles.authId` (the column) vs the JWT `authId` claim (fine). Only proceed if no code reads the **column**.

- [ ] **Step 2: If proceeding — source the JWT `authId` claim from email**

Ensure `signSession` callers pass `authId: row.email ?? row.id` (so the claim survives without the column). Then write `0005_drop_user_profiles_authid.sql`: `ALTER TABLE "user_profiles" DROP CONSTRAINT IF EXISTS "user_profiles_auth_id_key"; ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "auth_id";`, register it, apply, `npm run typecheck`, and commit.

> If unsure, **skip C2** — it is explicitly safe to defer indefinitely.

---

## Rollout sequence (operational)

1. Ship **Phase A** (schema only) to the DB ahead of any client. No app change required; existing prod code keeps working.
2. Ship **Phase B** (server + new app build) via staged native rollout (EAS / TestFlight / internal track). Old client builds keep working: their JWTs already carry `sub`, and `auth_id` is still populated. Apple Sign-In starts working for users on the new server.
3. Monitor for ~1–2 weeks (Vercel `level: error` on `verify`/`link`/sync; the spec's observability events).
4. Ship **Phase C** once healthy and orphan counts are zero.

---

## Spec-coverage map

| Spec requirement | Task |
|---|---|
| `google_sub`/`apple_sub`/`email_verified` columns | A1, A2 |
| Re-key coin_events/dividend_collections/referrals to uuid | A1 (backfill), C1 (constraints) |
| FK + ON DELETE CASCADE (orphan/GDPR fix) | C1 |
| Login resolves by provider subject | B3 |
| Auto-link on verified email; exclude unverified email | B3 |
| Apple "Hide My Email" → no duplicate (subject key) | B3 (Step 5) |
| Fix Apple Sign-In in the live verify | B3 |
| Settings "Connect account" (catch-all) | B4, B5 |
| `ctx.userId` everywhere on live endpoints | B1, B2 |
| Production-safe phased rollout / old-client compat | Phase A/B/C ordering; Rollout sequence |
| Lazy backfill of existing users' subjects | B3 (auto-link path) |
| Guest stays local-only | (no change — confirmed in spec; nothing to do) |
| Drop `auth_id` after settle | C2 (optional, gated) |
