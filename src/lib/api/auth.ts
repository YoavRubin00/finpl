// src/lib/api/auth.ts
import { api } from './client';
import type { ProfileRow } from './profile';

/**
 * Passwordless email verify — mints a JWT for a known email.
 * Used by the login screen AND by the one-time legacy-session migration
 * in lifecycle.bootFromToken (existing pre-JWT users carry only an email).
 */
export function verifyEmail(email: string, displayName: string | null) {
  return api.post<
    { provider: 'email'; email: string; displayName: string | null },
    { ok: true; profile: ProfileRow; token: string }
  >('/api/auth/verify', { provider: 'email', email, displayName });
}

/** Attach a second login provider to the currently-signed-in account. */
export function linkProvider(
  params: { provider: 'apple'; appleUserId: string } | { provider: 'google'; token: string },
) {
  return api.post<typeof params, { ok: true; profile: ProfileRow }>('/api/auth/link', params);
}
