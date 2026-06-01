# Identity Model Unification — One UUID Across the App

**Date:** 2026-05-31
**Status:** Approved; plan written (see [`../plans/2026-05-31-identity-uuid-unification.md`](../plans/2026-05-31-identity-uuid-unification.md))
**Owner:** naveh-elya
**Supersedes:** the frozen identifier decision in [`2026-05-21-data-persistence-architecture-design.md`](./2026-05-21-data-persistence-architecture-design.md) ("authId continues to be the user's email … migrating to a stable opaque UUID-as-primary-identifier is out of scope"). That non-goal is **reversed** by this spec.

## ⚠️ Production-reality addendum (discovered 2026-05-31, during planning)

Read-only probes of `finpl.vercel.app` established the live backend topology, which differs from what this spec originally assumed:

- **Live backend = the Vercel `api/` functions (JWT + `withAuth`).** Probe: `GET /api/sync/profile` → `"Missing Authorization header"` (the `withAuth` string).
- **The Expo Router `app/api/**+api.ts` routes are NOT deployed** (`app.json` has `web.output: "single"`, not `"server"`). They are dead code in production. Probe: `GET /api/referral/me` → 404.
- **Apple Sign-In is currently BROKEN in production.** The client posts `provider:'apple'`, but the live `api/auth/verify.ts` has no Apple branch and returns 400 `"Unsupported provider"`. Apple support exists only in the undeployed `app/api/auth/verify+api.ts`.
- **Referral endpoints are dead in production** (404). The tables `coin_events` / `dividend_collections` / `referrals` are written only by the undeployed `app/api/referral/*` code, so they are effectively inert in prod.

**Scope consequences (confirmed with owner):**
1. The login/linking algorithm and the Apple fix land in the **live** `api/auth/verify.ts` (not the `app/api` copy).
2. Re-keying the three email-keyed tables to UUID + FK proceeds as designed (low urgency since nothing live writes them, but it closes the schema gap and the cascade hole cheaply).
3. **Porting the referral *endpoints* into the live `api/` backend is OUT OF SCOPE** for this work (separate effort).
4. **Fixing Apple Sign-In in the live verify is IN SCOPE** — it is the natural caller of the new `apple_sub` linking and fixes a real outage.

## Problem statement

FinPlay identifies a user three different ways and uses two of them as join keys, inconsistently:

- `user_profiles.id` (uuid) — the real primary key.
- `user_profiles.auth_id` (text) — holds the **email**, used as a join key by several tables and endpoints.
- `user_profiles.email` (text) — holds the **same email** again, a second UNIQUE column.

The result is a split codebase:

- **Email-keyed** (`WHERE auth_id = ctx.authId`): `api/sync/profile`, `api/sync/economy`, `api/sync/subscription`, `api/migrate/backfill-v1`, the `app/api/referral/*` endpoints, and the tables `coin_events`, `dividend_collections`, `referrals` (which have **no foreign key** to `user_profiles`).
- **UUID-keyed** (`WHERE user_id = ctx.userId`): `api/sync/progress` (via a `resolveUserId()` email→uuid shim), `api/sync/user-stats`, and the tables `module_progress`, `ai_mentor_usage`, `paper_portfolio`, `paper_trades`, `user_feedback`, `support_messages`, `bridge_clicks`, `crowd_question_votes`, `breaking_news_tracked`, `user_stats`.

Concrete consequences:

1. **Email is a mutable join key.** `api/sync/profile` lets a client change `email` without touching `auth_id`, after which `auth_id ≠ email` silently breaks the "authId is the email" assumption baked into every email-keyed endpoint.
2. **No FK / no cascade on the email-keyed tables.** Deleting a user (or `deleteAccount()`) leaves `coin_events`, `dividend_collections`, and `referrals` orphaned — an economy-integrity and account-deletion gap.
3. **Duplicate accounts per person.** `auth_id = email` (UNIQUE) is the de-facto account key. A user who signs in with Google (one email) and later with Apple "Hide My Email" (a different relay address) gets **two separate accounts/UUIDs** with split progress, because nothing links the two credentials to one identity.

## Goals

- Exactly **one** internal identity that everything joins on: `user_profiles.id` (uuid).
- Email and OAuth subjects become **login-lookup / contact attributes**, never join keys.
- Multiple login methods (Google, Apple, email) for the **same person** resolve to **one** UUID.
- Apple "Hide My Email" never silently creates a duplicate account.
- The three email-keyed tables are re-keyed to the UUID, with FK + `ON DELETE CASCADE`.
- **Zero disruption to existing production users.** Every schema change is additive first; destructive cleanup happens only after the new path is proven.

## Non-goals (explicitly out of scope)

- **Merging accounts that are already duplicated in production** (a person who today already has both a Google account and a separate Apple-relay account = two UUIDs). The new model *prevents new duplicates* but will not auto-merge existing ones; that is a separate manual data-merge effort, deferred.
- **Unifying the two API backends** (`api/` Vercel+JWT and `app/api/` Expo Router). They stay separate. The only constraint imposed here is that **both must resolve identity to the UUID** — no consolidation of the auth mechanisms themselves.
- **Changing the guest model.** Guests remain local-only (no DB row) — see below.
- **Migrating to Neon Auth.** Rejected: it is Beta, web-only (no React Native/Expo SDK), and lacks Apple Sign-In and anonymous/guest support. Custom auth is retained.
- **Adding a separate `auth_identities` table.** Considered and rejected in favor of columns (see Design decisions).

## Design decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| The one universal key | `user_profiles.id` (uuid) | Already the PK, already JWT `sub`, already the RevenueCat App User ID. |
| Credential storage | **Columns on `user_profiles`** (`google_sub`, `apple_sub`), not a separate identities table | Only 3 providers; lower code surface / fewer joins; YAGNI. Migration risk is equal either way (both additive). Columns→table later is itself a safe additive migration, so this is not a one-way door. |
| `auth_id` column | Deprecate, then drop after settle | Pure redundancy with `email`; was only ever (mis)used as a join key. |
| `email` column | Keep as a non-key contact/login-lookup attribute (UNIQUE) | Needed for welcome/daily emails, support, display, and email login. |
| Guest data | Local-only until signup (Duolingo model) | Cheapest, best offline UX, smallest privacy footprint; closest to today. No DB row for guests. |
| Auth provider | Keep custom (Google / Apple / email + JWT) | Fits Expo + Vercel-serverless topology; Neon Auth doesn't. |
| Existing duplicate-account merge | Deferred | See non-goals. |

## Identity model

```
   GUEST  ──────────────►  local only (Zustand/MMKV). No UUID, no DB row. (unchanged)
   (no account)                       │ registers / signs in
                                      ▼
   REGISTERED ───────────►  user_profiles.id (UUID)  ◄── the ONE key everything joins on
   (1 person = 1 UUID)      ├─ google_sub   text UNIQUE   ─┐ login credentials that
                            ├─ apple_sub    text UNIQUE    ─┤ RESOLVE TO the id
                            ├─ email        text UNIQUE     ─┘ (also the contact attribute)
                            └─ email_verified boolean
                                      │ is_pro = true
                                      ▼
   SUBSCRIBER ───────────►  same row, is_pro flag. RevenueCat keyed to id. (unchanged)
```

## Schema changes

### `user_profiles` (additive)

```sql
ALTER TABLE user_profiles
  ADD COLUMN google_sub     text,
  ADD COLUMN apple_sub      text,
  ADD COLUMN email_verified boolean DEFAULT false;

-- Nullable UNIQUEs (Postgres allows multiple NULLs) — safe to add on a populated table.
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_google_sub_key UNIQUE (google_sub);
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_apple_sub_key  UNIQUE (apple_sub);

-- `email` keeps its existing UNIQUE constraint. `auth_id` is left in place for now
-- (deprecated) and dropped in the cleanup phase.
```

### Re-key the three email-keyed tables to the UUID

```sql
-- coin_events: auth_id (text/email) → user_id (uuid)
ALTER TABLE coin_events ADD COLUMN user_id uuid;
UPDATE coin_events c SET user_id = p.id
  FROM user_profiles p WHERE p.auth_id = c.auth_id;
-- (cleanup phase) add FK + index, NOT NULL, drop auth_id:
--   ALTER TABLE coin_events ADD CONSTRAINT coin_events_user_fk
--     FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
--   CREATE INDEX idx_coin_events_user_date ON coin_events(user_id, granted_at);

-- dividend_collections: PK was (auth_id, date_collected) → (user_id, date_collected)
ALTER TABLE dividend_collections ADD COLUMN user_id uuid;
UPDATE dividend_collections d SET user_id = p.id
  FROM user_profiles p WHERE p.auth_id = d.auth_id;

-- referrals: BOTH columns are emails
ALTER TABLE referrals ADD COLUMN referee_user_id uuid, ADD COLUMN referrer_user_id uuid;
UPDATE referrals r SET referee_user_id = pe.id, referrer_user_id = pr.id
  FROM user_profiles pe, user_profiles pr
  WHERE pe.auth_id = r.referee_auth_id AND pr.auth_id = r.referrer_auth_id;
```

Rows whose `auth_id` has no matching `user_profiles` row (pre-existing orphans) are reported and left for manual review — **not** silently dropped.

### Tables that need no change

`module_progress`, `ai_mentor_usage`, `paper_portfolio`, `paper_trades`, `user_feedback`, `support_messages`, `bridge_clicks`, `crowd_question_votes`, `breaking_news_tracked`, `user_stats` are already UUID-keyed. Verify only.

## Login & linking algorithm

Implemented in `api/auth/verify.ts` (and mirrored in `app/api/auth/verify+api.ts` if that path is live).

```
verify(provider, token | email):
  resolve credential from provider:
    google → verify token → (subject = google sub, email, email_verified = true)
    apple  → verify token → (subject = apple sub,  email|relay, email_verified = true)
    email  → (subject = email, email, email_verified = FALSE)   # no OTP today

  1. Returning credential:
       google → SELECT * FROM user_profiles WHERE google_sub = subject
       apple  → SELECT * FROM user_profiles WHERE apple_sub  = subject
       email  → SELECT * FROM user_profiles WHERE email      = email
     → FOUND → user = that row. (Apple relay works: apple_sub is stable.)

  2. New credential, try AUTO-LINK (only when the incoming email is provider-verified):
       if email_verified AND ∃ user with that email (and that user's email_verified = true):
         → attach: set google_sub / apple_sub on that existing row.

  3. Otherwise CREATE:
       INSERT user_profiles (id = uuid, email, email_verified, google_sub|apple_sub).

  → mint JWT { sub: user.id, authId: user.email }, return { profile, token }.
```

### Linking policy (locked)

- **Auto-link only on a provider-verified email.** Google and Apple verify; safe.
- **Plain email login is `email_verified = false` and is excluded from auto-link** — auto-linking it would allow attaching to a victim's Google account by typing their address.
- **Apple "Hide My Email"** cannot be auto-linked by email (relay ≠ real address). It is handled by an explicit **"Connected accounts" screen in Settings**: while signed in, the user taps "Connect Apple", we obtain the Apple `sub`, and attach `apple_sub` to the current UUID. This is the catch-all for any case auto-link cannot cover.

### ⚠️ Pre-existing security hole (documented, not fixed here)

Email login is currently **passwordless and unverified**: the password field in `RegisterScreen` is cosmetic (`password-utils.ts` only computes a UI strength meter), no password is sent to the server ([`LoginScreen.tsx:75`](../../../src/features/auth/LoginScreen.tsx#L75) posts only `{ provider: 'email', email }`), and there is no password/bcrypt logic in `api/`. So today **anyone can sign in as any account — including Google/Apple-registered ones — by typing that account's email** with `provider: 'email'`.

This spec **does not introduce** this vector and **does not worsen** it (the returning-email branch preserves today's behavior), but it also **does not fix** it. The clean fix is to make the email path **OTP-verified** (magic link / one-time code), after which `email_verified = true` for email logins and the branch becomes safe. This is strongly recommended as a **fast-follow** but is scoped as a separate effort to keep this migration focused. Flagging it here so the decision is explicit rather than accidental.

## "Right id everywhere" — endpoint changes

The JWT already carries `sub` (the UUID), so `ctx.userId` is authoritative in every `withAuth` handler. Changes are mechanical:

**`api/` (Vercel, JWT via `withAuth`):**
- `api/sync/profile.ts`, `api/sync/economy.ts`, `api/sync/subscription.ts`, `api/migrate/backfill-v1.ts`: change `WHERE auth_id = ctx.authId` → `WHERE id = ctx.userId`.
- `api/sync/progress.ts`: delete the `resolveUserId()` email→uuid shim; use `ctx.userId` directly.
- `api/sync/user-stats.ts`: already `ctx.userId`; verify only.
- `api/auth/verify.ts`: implement the login/linking algorithm above.

**`app/api/` (Expo Router):**
- `app/api/referral/{me,collect,redeem,register-code}+api.ts`: resolve and key on `user_id` (uuid) instead of `auth_id` (email). Read referral writes/reads against the re-keyed `referrals` / `coin_events` / `dividend_collections`.
- Any `app/api/sync/*` mirror endpoints: same `ctx.userId` rule (constraint, not consolidation — backends stay separate).

**Client:**
- `convertGuestToUser` / `signInWithProfile` flows unchanged in shape; they continue to receive `{ profile, token }` and store `userId = profile.id`. No client identity change required beyond the new Settings "Connect account" screen.

## Migration & rollout (production-safe ordering)

Native app rollout is staged (EAS / TestFlight / internal track), so old and new client builds call the API concurrently. The JWT keeps both `sub` and `authId`, so tokens minted by the old `verify` continue to work against new handlers (they read `ctx.userId` from `sub`, which the old verify already set).

- **Phase A — additive schema (no behavior change).** Add `google_sub` / `apple_sub` / `email_verified`; add nullable `user_id` columns to the three tables; backfill them from the `auth_id` join; add indexes. Existing code still uses `auth_id` and is unaffected. Fully reversible (drop the added columns).
- **Phase B — code switch.** Deploy handlers that read/write `user_id` and resolve login via `google_sub`/`apple_sub` + verified-email auto-link. Existing users keep their `email`; their `google_sub`/`apple_sub` stay NULL until their next provider login, at which point the auto-link step fills them in (gradual, no big-bang backfill of subjects). Rollback = redeploy old code (`auth_id` still present).
- **Phase C — cleanup (after settle, e.g. ~1–2 weeks of healthy metrics).** Set the three tables' `user_id` `NOT NULL`, add FK + `ON DELETE CASCADE` (this is where the orphan/cascade gap closes), drop the old `auth_id`-based columns/indexes on those tables, and drop `user_profiles.auth_id`.

### Backfill of existing users' provider subjects

We do **not** know which provider each existing user used (only `auth_id`/`email` are stored). So Phase B does not attempt to populate `google_sub`/`apple_sub` for existing rows. Instead, each existing user's subject is captured on their next login via the auto-link path (verified email matches the existing row → set the subject). This is intentionally lazy and avoids guessing.

## Observability

Reuse existing analytics (`captureEvent` / PostHog). Add events:

| Event | When | Properties |
|---|---|---|
| `account_linked` | A new provider subject is attached to an existing UUID (auto or manual) | `provider`, `method` (`auto_email` \| `settings`) |
| `account_created` | A brand-new `user_profiles` row is inserted at login | `provider` |
| `rekey_orphans_found` | Migration finds `auth_id` rows with no matching profile | `table`, `count` |

Server: scan Vercel logs for `level: error` on `verify` and the re-keyed endpoints for the first 48h after each phase.

## Testing & smoke tests

- **One identity, many providers:** sign in with Google, then "Connect Apple" in Settings → assert one UUID, both `google_sub` and `apple_sub` set, progress intact.
- **Apple relay no-dupe:** fresh sign-in with Apple Hide-My-Email, then later Connect from a Google session → assert no second account is created and the Apple sub attaches to the existing UUID.
- **Auto-link safety:** plain-email login with a victim's address → assert it does **not** auto-link to that victim's Google account (`email_verified = false` excluded).
- **Re-key integrity:** after Phase A, assert every `coin_events` / `dividend_collections` / `referrals` row has a non-NULL `user_id` (except reported orphans), and counts match pre-migration.
- **Cascade:** after Phase C, delete a test user → assert their `coin_events` / `dividend_collections` / `referrals` rows are gone.
- **Old-client compatibility:** a JWT minted by the old `verify` still reads/writes correctly against new handlers.
- **Guest unchanged:** guest play accrues locally with no DB row; signup backfills it (existing behavior preserved).

## Phase summary

| Phase | Scope | Risk |
|---|---|---|
| A | Additive schema + `user_id` backfill on the 3 tables | Low (reversible, no behavior change) |
| B | Code switch to `ctx.userId` everywhere + login/linking algorithm + Settings "Connect account" | Medium (behavior change; staged rollout) |
| C | NOT NULL + FK/cascade + drop `auth_id` | Low (only after B is proven) |
