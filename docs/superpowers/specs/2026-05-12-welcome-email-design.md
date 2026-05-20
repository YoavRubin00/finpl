# Welcome Email — Design Spec

**Date:** 2026-05-12
**Owner:** Naveh
**Status:** Approved — ready for implementation plan

## Goal

Send a single, branded HTML welcome email to every new FinPlay user the moment their profile is first created in the database. The email comes from the existing FinPlay sender (`EMAIL_FROM`, currently `FinPlay <onboarding@resend.dev>`, soon `hello@finplay.me` once the env var is updated), is written in Hebrew, and contains a CTA back to the app.

## Non-goals

- No drip sequences or marketing campaigns (the existing daily re-engagement system at [app/api/email/send-daily+api.ts](../../../app/api/email/send-daily+api.ts) handles that).
- No unsubscribe link in the welcome email (one-time transactional, legally fine without it; the daily emails have unsubscribe handling already).
- No A/B testing infrastructure.
- No analytics on opens/clicks beyond what Resend gives by default.

## Existing infrastructure (reused, not rebuilt)

| Resource | Location | Reuse pattern |
|---|---|---|
| `resend` SDK | `^6.12.0` in `package.json` | Import `Resend` from `'resend'` |
| `RESEND_API_KEY` env var | Already in `.env.example` | Read via `process.env.RESEND_API_KEY` |
| `EMAIL_FROM` env var | Already in `.env.example` | Read via `process.env.EMAIL_FROM`, fall back to `'FinPlay <onboarding@resend.dev>'` |
| Email template module | `src/features/email/emailTemplates.ts` | Add a new exported function `buildWelcomeEmailHtml(...)` alongside the existing `buildDailyEmailHtml(...)` |
| Shared API helpers | `app/api/_shared/` (already used by `verify+api.ts` for `rateLimit`, `safeError`) | Add a new `app/api/_shared/sendWelcomeEmail.ts` here for parity |
| Mascot image hosting | Vercel Blob — `https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/mascot/fin-happy.webp` | Reuse — already in production for daily emails |
| `welcomeEmailSent` flag | `userProfiles.welcomeEmailSent` ([schema.ts:20](../../../src/db/schema.ts#L20)) | Source of truth for "has this user already received the welcome?" |

## Architecture

```
RegisterScreen / Google / Apple sign-in
        │
        ▼
POST /api/auth/verify+api.ts          (existing endpoint)
        │
        ├── verify token (Google / Apple / email)
        ├── upsert userProfiles row
        ├── generate syncToken if missing
        │
        └── if profile.welcomeEmailSent === false
            and profile.email is a valid email
            and RESEND_API_KEY is set
                → await sendWelcomeEmail({ db, email, displayName, userId })
                  (awaited inside the handler so serverless hosts don't
                  terminate the in-flight request; errors are caught and
                  logged but never bubble up to the client)
                → on Resend success: db.update(userProfiles)
                    .set({ welcomeEmailSent: true })
                    .where(id = userId)
```

### New / modified files

| File | Status | Purpose |
|---|---|---|
| `src/features/email/emailTemplates.ts` | **Modified** | Add `buildWelcomeEmailHtml({ name, ctaUrl }) → { subject, html, text }`. Sits alongside the existing `buildDailyEmailHtml`. Exports the brand color constants (`BLUE`, `DARK_BLUE`, `ORANGE`, `BG`) if they aren't already exported, so the welcome template can reuse them. |
| `app/api/_shared/sendWelcomeEmail.ts` | **New** | Single function `sendWelcomeEmail({ db, email, displayName, userId })`. Builds template, calls Resend, on success updates `welcomeEmailSent = true`. Catches and logs all errors, never throws. |
| `app/api/auth/verify+api.ts` | **Modified** | After the upsert + syncToken generation, check `profile.welcomeEmailSent` on the row we just fetched; call `await sendWelcomeEmail(...)` if false and email is valid. The send call is awaited but wrapped in a `try/catch` that always continues to the success response. |

### Trigger detection

The `userProfiles` table already has `welcomeEmailSent: boolean` (default `false`). This is the source of truth.

- **First sign-in** → row inserted with `welcomeEmailSent = false` → send → flip to `true`.
- **Subsequent sign-ins** → row updated, flag is `true` → no send.
- **Resend failure** → flag stays `false` → next sign-in retries automatically. Self-healing.

No need for Postgres `xmax` tricks or insert-vs-update detection.

### Email skip conditions

The send is skipped (silently, logged at `console.info`) when any of these are true:

1. `RESEND_API_KEY` env var not set — covers local dev and prevents accidental emails.
2. `welcomeEmailSent` is already `true` — covers returning users.
3. `verifiedEmail` is not a valid email format (e.g. Apple hidden-ID users where the `email` column ends up `null`).

## Email content

### Subject
```
ברוכים הבאים ל-FinPlay
```

### Headers
- **From:** `process.env.EMAIL_FROM` (currently `FinPlay <onboarding@resend.dev>` — will switch to `FinPlay <hello@finplay.me>` once the env var is updated)
- **Reply-To:** `hello@finplay.me` — explicitly set in `sendWelcomeEmail.ts` (the existing daily-email reply-to is `yoav.finplay@gmail.com`; the welcome email uses the canonical brand inbox per Naveh's spec)
- **To:** `userProfiles.email`

### Hebrew copy

```
ברוכים הבאים, {{displayName}}

עכשיו, כשהצטרפת לקהילה, אנחנו הופכים כל
החלטה פיננסית למשחק.

[CTA: פתח/י את FinPlay]   →   finpl://learn

01 — שיעורים קצרים על השקעות, חיסכון
     ופסיכולוגיה של כסף
02 — משימות יומיות, סטריקים ולוחות מצטיינים
03 — מנטור AI שזמין 24/7 לכל שאלה פיננסית

יש שאלה, פידבק או רעיון? תענו למייל הזה —
אנחנו קוראים הכל.

— צוות FinPlay
```

### Visual design

**Reuses the existing daily-email visual language** for brand consistency:

| Element | Style |
|---|---|
| Document | `<html dir="rtl" lang="he">`, body bg `#f0f9ff` (sky-blue tint, matches daily emails), max-width 520px centered |
| Hero band | Gradient `linear-gradient(135deg, #0ea5e9, #0369a1)` (FinPlay sky-blue → dark blue, matches daily emails — **not** purple/pink/cyan), white "FinPlay" wordmark, ~26px bold |
| Mascot | The happy shark — `https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/mascot/fin-happy.webp`, 140×140, half-emerging from the gradient header (same treatment as daily emails). This is a hosted brand asset, not a generic emoji. |
| Content card | White, `border-radius: 16px`, soft shadow (`0 2px 12px rgba(0,0,0,0.08)`), 24px padding |
| Heading | 22px bold, dark navy `#1e3a5f`, right-aligned (matches daily emails) |
| Subhead | 17px, slate `#374151`, 1.6 line-height |
| Feature blocks | Numbered `01 / 02 / 03` in 40×40 sky-blue `#0ea5e9` rounded squares (white bold text), description text alongside in RTL flex layout |
| CTA button | Solid `#0ea5e9`, white bold text, ~18px, padding 16px 40px, `border-radius: 14px`, shadow `0 4px 14px rgba(14,165,233,0.45)` — visually identical to existing daily-email CTAs |
| Footer | 12px slate `#9ca3af`, centered, `© 2026 FinPlay · finplay.me` |
| Fonts | `Arial, Helvetica, sans-serif` (matches existing daily emails — Hebrew renders well in Arial across email clients) |
| **No emoji in body copy** (per spec) — the shark mascot is a hosted PNG/WebP asset, not a Unicode emoji |

### Plain-text fallback

`buildWelcomeEmailHtml` returns `{ subject, html, text }`. The `text` field is a clean Hebrew transcript of the copy above (no markup, line breaks preserved). The send to Resend includes both `html` and `text` — Resend forwards both in a `multipart/alternative` MIME message, and clients that block HTML render the plain-text version.

> Note: the existing `buildDailyEmailHtml` returns only `{ subject, html }`. The welcome version adds `text` because welcome emails are higher-stakes for deliverability (first impression — must land in inbox, not promotions/spam) and a text part materially improves Gmail's classifier.

## Env vars

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `RESEND_API_KEY` | Yes (in prod) | — | Already defined. Absent → sending is skipped (logged). |
| `EMAIL_FROM` | No | `'FinPlay <onboarding@resend.dev>'` | Already defined. Should be updated to `'FinPlay <hello@finplay.me>'` in production env. |

The CTA URL is **hardcoded to `finpl://learn`** to match the existing daily emails' deep-link pattern — no new env var introduced.

## Error handling

- All Resend calls wrapped in `try / catch` inside `sendWelcomeEmail`. Errors are logged and swallowed — `sendWelcomeEmail` never throws.
- The verify endpoint `await`s the send before returning its response. This is required because serverless hosts (Vercel / EAS Hosting) may terminate the function after `Response` is returned, killing any unawaited promises.
- Added latency on the first signup only: ~300–500ms (Resend API round-trip). Returning sign-ins hit the flag check and skip immediately — zero added latency.
- The DB flag flip happens inside `sendWelcomeEmail`, only after a successful Resend response. On Resend failure, the flag stays `false` and the next sign-in retries.
- Logged events:
  - `[email] welcome sent: userId=<uuid>` on success (no raw email address)
  - `[email] welcome failed: <error.message>` on failure
  - `[email] welcome skipped: reason=<no-key|already-sent|no-email>` on skip

## Security / privacy

- `RESEND_API_KEY` server-side only — never bundled into the React Native client (it's read via `process.env` in API routes only).
- Display name is sanitized via existing `sanitizeString` helper before reaching the template (already done in [verify+api.ts:101](../../../app/api/auth/verify+api.ts#L101)).
- Display name is HTML-escaped inside `buildWelcomeEmailHtml` before interpolation into the HTML (`&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`).
- No raw email addresses written to logs — we log `userId` (UUID) instead.

## Testing approach

- **Unit test `buildWelcomeEmailHtml`**: pure function, snapshot-test the HTML/text outputs for a given input; verify HTML-escape on adversarial display names (e.g. `<script>alert(1)</script>`).
- **Unit test `sendWelcomeEmail`**: mock the Resend client, verify it (a) skips when key missing, (b) calls Resend with correct params when key present, (c) sets DB flag on success only, (d) does not throw on Resend failure.
- **Integration test for `verify+api.ts`**: covered separately — verify that a fresh signup triggers exactly one send, and a repeat signup triggers zero.
- **Manual smoke test**: deploy to staging with a real Resend key, sign up with a real address, verify email arrives and renders correctly in Gmail (iOS app + web), Apple Mail (iOS + macOS), Outlook web.

## Out-of-scope follow-ups (not in this spec)

- Daily tips email (already exists at [app/api/email/send-daily+api.ts](../../../app/api/email/send-daily+api.ts)).
- Re-engagement / churn emails for inactive users (also handled by the daily pipeline).
- Email preference center beyond the existing `dailyEmailEnabled` flag.
- Localization to other languages.
- Updating the existing daily-email reply-to from `yoav.finplay@gmail.com` to `hello@finplay.me` (separate, trivial change).
