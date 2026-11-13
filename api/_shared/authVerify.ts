// api/_shared/authVerify.ts
//
// The decision logic of POST /api/auth/verify and POST /api/auth/email-code,
// with every side effect injected (stores, Apple keys, Google fetch, profile
// lookup, session minting, email sending). Production wiring lives in
// authDeps.ts; scripts/test-auth-verify.ts runs this same code in memory.
//
// Invariant: a profile or session token is returned ONLY after the provider
// proof passed — email code, Apple signature, or Google audience. There is no
// unverified fallback for older app versions; they get a 401 with a `code`.

import {
  EMAIL_CODE_MAX_ATTEMPTS,
  EMAIL_CODE_RESEND_COOLDOWN_SEC,
  EMAIL_CODE_TTL_SEC,
  appleTokenKid,
  checkEmailCode,
  generateEmailCode,
  hashEmailCode,
  isSixDigitCode,
  normalizeEmail,
  resolveGoogleToken,
  verifyAppleIdentityToken,
  type AppleJwk,
  type FetchLike,
} from './authProof';
import { throttleKey, type EmailCodeStore, type RateLimitStore } from './authStores';
import type { SendLoginCodeResult } from './sendLoginCodeEmail';

export type AuthProvider = 'google' | 'email' | 'apple';

/** Machine-readable reason in every error body. Old clients ignore it and show their generic failure. */
export type AuthErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_EMAIL'
  | 'EMAIL_CODE_REQUIRED'
  | 'EMAIL_CODE_INVALID'
  | 'EMAIL_CODE_EXPIRED'
  | 'EMAIL_CODE_TOO_MANY_ATTEMPTS'
  | 'EMAIL_SEND_FAILED'
  | 'APPLE_TOKEN_REQUIRED'
  | 'APPLE_TOKEN_INVALID'
  | 'GOOGLE_TOKEN_REQUIRED'
  | 'GOOGLE_TOKEN_INVALID'
  | 'UNSUPPORTED_PROVIDER'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE';

export interface ResolvedCredential {
  provider: AuthProvider;
  /** google sub | apple sub | normalized email */
  subject: string;
  /** Deliverable address, if known. Only trust it for linking when emailVerified. */
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
}

export interface AuthResponse {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}

export function authError(
  status: number,
  code: AuthErrorCode,
  error: string,
  extra?: Record<string, unknown>,
  headers?: Record<string, string>,
): AuthResponse {
  return { status, body: { ok: false, code, error, ...extra }, headers };
}

function rateLimited(resetAtMs: number, nowMs: number): AuthResponse {
  const retryAfterSec = Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));
  return authError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.', { retryAfterSec }, { 'Retry-After': String(retryAfterSec) });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const cleaned = v.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, max);
  return cleaned.length > 0 ? cleaned : null;
}

// Durable throttles (shared by every instance through auth_rate_limits).
export const EMAIL_CODE_IP_LIMIT = { max: 20, windowSec: 15 * 60 };
export const EMAIL_CODE_PER_EMAIL_LIMIT = { max: 6, windowSec: 60 * 60 };
export const VERIFY_EMAIL_IP_LIMIT = { max: 30, windowSec: 15 * 60 };

// ─── Credential resolution ───────────────────────────────────────────────────

export interface CredentialDeps {
  emailCodes: EmailCodeStore;
  rateLimits: RateLimitStore;
  emailCodeSecret: () => string;
  /** Apple's JWKS. forceRefresh bypasses the cache (used once when a token's kid is unknown). */
  getAppleKeys: (opts: { forceRefresh: boolean }) => Promise<AppleJwk[]>;
  appleAudiences: readonly string[];
  googleClientIds: readonly string[];
  fetchImpl: FetchLike;
  now: () => number;
}

export type CredentialOutcome = { ok: true; cred: ResolvedCredential } | { ok: false; response: AuthResponse };

async function resolveEmail(body: Record<string, unknown>, clientIp: string, deps: CredentialDeps): Promise<CredentialOutcome> {
  const email = normalizeEmail(body.email);
  if (!email) return { ok: false, response: authError(400, 'INVALID_EMAIL', 'Invalid email') };

  // Old app versions (≤1.4.9) send no code at all. Not counted as a guess.
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (code.length === 0) {
    return { ok: false, response: authError(401, 'EMAIL_CODE_REQUIRED', 'A sign-in code is required') };
  }

  const nowMs = deps.now();
  const ipHit = await deps.rateLimits.hit(throttleKey('verify-email-ip', clientIp), VERIFY_EMAIL_IP_LIMIT.windowSec, nowMs);
  if (ipHit.count > VERIFY_EMAIL_IP_LIMIT.max) return { ok: false, response: rateLimited(ipHit.resetAtMs, nowMs) };

  // A malformed code can never match; reject without burning an attempt.
  if (!isSixDigitCode(code)) {
    return { ok: false, response: authError(401, 'EMAIL_CODE_INVALID', 'Invalid sign-in code') };
  }

  const stored = await deps.emailCodes.registerAttempt(email);
  if (!stored) {
    // No code on file (never requested, already used, or replaced and purged).
    return { ok: false, response: authError(401, 'EMAIL_CODE_INVALID', 'Invalid sign-in code', { attemptsLeft: 0 }) };
  }

  const submittedHash = hashEmailCode(email, code, deps.emailCodeSecret());
  const verdict = checkEmailCode(stored, submittedHash, nowMs);
  if (verdict === 'expired') {
    return { ok: false, response: authError(401, 'EMAIL_CODE_EXPIRED', 'The sign-in code expired') };
  }
  if (verdict === 'too_many_attempts') {
    return { ok: false, response: authError(401, 'EMAIL_CODE_TOO_MANY_ATTEMPTS', 'Too many wrong codes. Request a new one.') };
  }
  if (verdict === 'wrong_code') {
    const attemptsLeft = Math.max(0, EMAIL_CODE_MAX_ATTEMPTS - stored.attempts);
    return { ok: false, response: authError(401, 'EMAIL_CODE_INVALID', 'Invalid sign-in code', { attemptsLeft }) };
  }

  // Single use: only the request that deletes the row wins.
  if (!(await deps.emailCodes.consume(email, stored.codeHash))) {
    return { ok: false, response: authError(401, 'EMAIL_CODE_INVALID', 'Invalid sign-in code', { attemptsLeft: 0 }) };
  }

  return {
    ok: true,
    cred: { provider: 'email', subject: email, email, emailVerified: true, displayName: cleanText(body.displayName, 100) },
  };
}

async function resolveApple(body: Record<string, unknown>, deps: CredentialDeps): Promise<CredentialOutcome> {
  const identityToken = typeof body.identityToken === 'string' ? body.identityToken.trim() : '';
  if (!identityToken) {
    // Old app versions send only appleUserId, which proves nothing.
    return { ok: false, response: authError(401, 'APPLE_TOKEN_REQUIRED', 'Apple identity token is required') };
  }
  const claimedSub = cleanText(body.appleUserId, 255);

  let keys: AppleJwk[];
  try {
    keys = await deps.getAppleKeys({ forceRefresh: false });
    const kid = appleTokenKid(identityToken);
    if (kid && !keys.some((k) => k.kid === kid)) keys = await deps.getAppleKeys({ forceRefresh: true });
  } catch (err: unknown) {
    console.error('[auth] apple jwks fetch failed:', err instanceof Error ? err.message : String(err));
    return { ok: false, response: authError(503, 'SERVICE_UNAVAILABLE', 'Apple sign-in is temporarily unavailable') };
  }

  const result = verifyAppleIdentityToken(identityToken, {
    keys,
    audiences: deps.appleAudiences,
    expectedSub: claimedSub,
    nowSec: Math.floor(deps.now() / 1000),
  });
  if (!result.ok) {
    console.warn(`[auth] apple token rejected: reason=${result.reason}`);
    return { ok: false, response: authError(401, 'APPLE_TOKEN_INVALID', 'Invalid Apple identity token') };
  }

  // The email comes from Apple's signed token only; a client-sent `email` is ignored.
  const email = result.emailVerified ? normalizeEmail(result.email) : null;
  return {
    ok: true,
    cred: { provider: 'apple', subject: result.sub, email, emailVerified: email !== null, displayName: cleanText(body.displayName, 100) },
  };
}

async function resolveGoogle(body: Record<string, unknown>, deps: CredentialDeps): Promise<CredentialOutcome> {
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) return { ok: false, response: authError(400, 'GOOGLE_TOKEN_REQUIRED', 'Missing Google token') };

  let result;
  try {
    result = await resolveGoogleToken(token, { clientIds: deps.googleClientIds, fetchImpl: deps.fetchImpl });
  } catch (err: unknown) {
    console.error('[auth] google verification failed:', err instanceof Error ? err.message : String(err));
    return { ok: false, response: authError(503, 'SERVICE_UNAVAILABLE', 'Google sign-in is temporarily unavailable') };
  }
  if (!result.ok) {
    console.warn(`[auth] google token rejected: reason=${result.reason}`);
    return { ok: false, response: authError(401, 'GOOGLE_TOKEN_INVALID', 'Invalid Google token') };
  }

  // An address Google hasn't verified is never used to find or link a row.
  const email = result.emailVerified ? normalizeEmail(result.email) : null;
  return {
    ok: true,
    cred: { provider: 'google', subject: result.sub, email, emailVerified: email !== null, displayName: cleanText(result.name, 100) },
  };
}

export async function resolveCredential(body: unknown, clientIp: string, deps: CredentialDeps): Promise<CredentialOutcome> {
  if (!isRecord(body)) return { ok: false, response: authError(400, 'INVALID_REQUEST', 'Invalid request body') };
  switch (body.provider) {
    case 'email':
      return resolveEmail(body, clientIp, deps);
    case 'apple':
      return resolveApple(body, deps);
    case 'google':
      return resolveGoogle(body, deps);
    default:
      return { ok: false, response: authError(400, 'UNSUPPORTED_PROVIDER', 'Unsupported provider') };
  }
}

// ─── POST /api/auth/verify ───────────────────────────────────────────────────

export interface SessionProfile {
  id: string;
  authId: string;
}

export interface VerifyDeps<TProfile extends SessionProfile> extends CredentialDeps {
  findOrCreateProfile: (cred: ResolvedCredential) => Promise<TProfile | null>;
  mintSession: (profile: TProfile) => string;
  /** Best-effort side effects after a successful sign-in (welcome email). Must not throw. */
  afterSignIn?: (profile: TProfile) => Promise<void>;
}

export async function handleVerify<TProfile extends SessionProfile>(
  body: unknown,
  clientIp: string,
  deps: VerifyDeps<TProfile>,
): Promise<AuthResponse> {
  const outcome = await resolveCredential(body, clientIp, deps);
  if (!outcome.ok) return outcome.response;

  const profile = await deps.findOrCreateProfile(outcome.cred);
  if (!profile) return { status: 500, body: { ok: false, error: 'Profile lookup failed after upsert' } };

  if (deps.afterSignIn) await deps.afterSignIn(profile);

  const token = deps.mintSession(profile);
  console.info(`[auth] verify ok: provider=${outcome.cred.provider} user=${profile.id}`);
  return { status: 200, body: { ok: true, profile, token } };
}

// ─── POST /api/auth/email-code ───────────────────────────────────────────────

export interface EmailCodeDeps {
  emailCodes: EmailCodeStore;
  rateLimits: RateLimitStore;
  emailCodeSecret: () => string;
  sendCode: (email: string, code: string, ttlMinutes: number) => Promise<SendLoginCodeResult>;
  now: () => number;
  /** Tests inject a known code; production uses crypto.randomInt. */
  generateCode?: () => string;
}

/**
 * Mail a fresh code. The answer never depends on whether an account exists:
 * the same code signs in an existing user or creates a new one.
 */
export async function handleEmailCodeRequest(body: unknown, clientIp: string, deps: EmailCodeDeps): Promise<AuthResponse> {
  const email = normalizeEmail(isRecord(body) ? body.email : undefined);
  if (!email) return authError(400, 'INVALID_EMAIL', 'Invalid email');

  const nowMs = deps.now();
  const ipHit = await deps.rateLimits.hit(throttleKey('email-code-ip', clientIp), EMAIL_CODE_IP_LIMIT.windowSec, nowMs);
  if (ipHit.count > EMAIL_CODE_IP_LIMIT.max) return rateLimited(ipHit.resetAtMs, nowMs);

  const emailHit = await deps.rateLimits.hit(throttleKey('email-code-addr', email), EMAIL_CODE_PER_EMAIL_LIMIT.windowSec, nowMs);
  if (emailHit.count > EMAIL_CODE_PER_EMAIL_LIMIT.max) return rateLimited(emailHit.resetAtMs, nowMs);

  const code = (deps.generateCode ?? generateEmailCode)();
  const issued = await deps.emailCodes.issue(
    email,
    hashEmailCode(email, code, deps.emailCodeSecret()),
    nowMs + EMAIL_CODE_TTL_SEC * 1000,
    nowMs,
    EMAIL_CODE_RESEND_COOLDOWN_SEC,
  );
  if (!issued) {
    const existing = await deps.emailCodes.get(email);
    const resetAtMs = (existing?.lastSentAtMs ?? nowMs) + EMAIL_CODE_RESEND_COOLDOWN_SEC * 1000;
    return rateLimited(resetAtMs, nowMs);
  }

  const sent = await deps.sendCode(email, code, Math.round(EMAIL_CODE_TTL_SEC / 60));
  if (!sent.ok) {
    // Nothing reached the inbox: drop the row so an immediate retry isn't held by the cooldown.
    await deps.emailCodes.remove(email);
    return authError(503, 'EMAIL_SEND_FAILED', 'Could not send the sign-in code');
  }

  // Housekeeping, never fatal.
  try {
    await deps.emailCodes.purgeExpired(nowMs);
    await deps.rateLimits.purgeOld(nowMs);
  } catch { /* ignore */ }

  return { status: 200, body: { ok: true, resendAfterSec: EMAIL_CODE_RESEND_COOLDOWN_SEC, expiresInSec: EMAIL_CODE_TTL_SEC } };
}
