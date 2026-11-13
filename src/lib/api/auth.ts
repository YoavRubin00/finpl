// src/lib/api/auth.ts
import { ApiError, api } from './client';
import type { ProfileRow } from './profile';
import { getApiBase } from '../../db/apiBase';

/** Mirrors AuthErrorCode in api/_shared/authVerify.ts. */
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

export interface VerifiedSession {
  ok: true;
  profile: ProfileRow;
  token: string;
}

export interface AuthErrorDetail {
  /** Server code, 'NETWORK' when the request never got an answer, 'UNKNOWN' otherwise. */
  code: AuthErrorCode | 'NETWORK' | 'UNKNOWN';
  attemptsLeft: number | null;
  retryAfterSec: number | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * POST without the session header and without the shared client's
 * "401 → sign out" hook: these calls happen before sign-in, and a wrong code
 * is an ordinary 401 that must not touch any existing session.
 */
async function postPublic<TBody, TResponse>(path: string, body: TBody, timeoutMs = 15000): Promise<TResponse> {
  const base = getApiBase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(base ? `${base}${path}` : path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    if (!res.ok) {
      const message = isRecord(parsed) && typeof parsed.error === 'string' ? parsed.error : `HTTP ${res.status}`;
      throw new ApiError(message, res.status, parsed);
    }
    return parsed as TResponse;
  } finally {
    clearTimeout(timer);
  }
}

/** Mail a 6-digit sign-in code. Same answer whether or not the account exists. */
export function requestEmailCode(email: string) {
  return postPublic<{ email: string }, { ok: true; resendAfterSec: number; expiresInSec: number }>(
    '/api/auth/email-code',
    { email },
  );
}

/**
 * Exchange the mailed code for a session. Signs in an existing account or
 * creates a new one (displayName is used only for a new account).
 */
export function verifyEmailCode(email: string, code: string, displayName: string | null) {
  return postPublic<
    { provider: 'email'; email: string; code: string; displayName: string | null },
    VerifiedSession
  >('/api/auth/verify', { provider: 'email', email, code, displayName });
}

export function authErrorDetail(err: unknown): AuthErrorDetail {
  if (err instanceof ApiError) {
    const body = isRecord(err.body) ? err.body : {};
    const code = typeof body.code === 'string' ? (body.code as AuthErrorCode) : 'UNKNOWN';
    return {
      code,
      attemptsLeft: typeof body.attemptsLeft === 'number' ? body.attemptsLeft : null,
      retryAfterSec: typeof body.retryAfterSec === 'number' ? body.retryAfterSec : null,
    };
  }
  return { code: 'NETWORK', attemptsLeft: null, retryAfterSec: null };
}

/** Attach a second login provider to the currently-signed-in account. */
export function linkProvider(
  params: { provider: 'apple'; identityToken: string; appleUserId: string } | { provider: 'google'; token: string },
) {
  return api.post<typeof params, { ok: true; profile: ProfileRow }>('/api/auth/link', params);
}
