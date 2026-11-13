-- 0016: email sign-in codes + durable auth throttles (2026-11-13).
--
-- Email accounts used to be passwordless with NO proof of ownership:
-- POST /api/auth/verify {provider:'email', email} returned that account's
-- profile + session to anyone who typed the address. Email sign-in now needs a
-- 6-digit code mailed by POST /api/auth/email-code.
--
-- email_login_codes: one row per address (normalized: trimmed + lowercased).
--   code_hash  = HMAC-SHA256(EMAIL_CODE_SECRET or AUTH_JWT_SECRET, email:code), hex.
--                The code itself is never stored.
--   expires_at = sent + 10 minutes. attempts = guesses made (max 5).
--   last_sent_at enforces the 30-second resend cooldown.
--   A new request replaces the row; a successful sign-in deletes it.
--
-- auth_rate_limits: fixed-window counters shared by every serverless instance
--   (the in-memory limiter is per instance only). key = "<scope>:<sha256>".
--
-- Additive + idempotent. Run manually against prod DATABASE_URL BEFORE the
-- server deploy (NOT drizzle-kit push — known schema drift). Until it runs,
-- /api/auth/email-code answers 503 and email sign-in is unavailable.

CREATE TABLE IF NOT EXISTS "email_login_codes" (
  "email" text PRIMARY KEY NOT NULL,
  "code_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_sent_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_email_login_codes_expires"
  ON "email_login_codes" USING btree ("expires_at");

CREATE TABLE IF NOT EXISTS "auth_rate_limits" (
  "key" text PRIMARY KEY NOT NULL,
  "window_start" timestamp with time zone DEFAULT now() NOT NULL,
  "count" integer DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_auth_rate_limits_window"
  ON "auth_rate_limits" USING btree ("window_start");
