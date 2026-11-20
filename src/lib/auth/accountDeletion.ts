// src/lib/auth/accountDeletion.ts
//
// Settings → "מחיקת חשבון לצמיתות". Until 2026-11-20 this only cleared
// AsyncStorage: the server account and its data stayed, and the session token
// (in secure storage) survived, so the next cold start signed the user back in.
//
//   Signed in (a session token on this device)
//       POST /api/account/delete. Only when the server answers 200 (deleted,
//       or already deleted) is the device wiped (token, RevenueCat identity,
//       query cache, every local store and everything persisted, scheduled
//       notifications, PostHog identity). Any failure deletes nothing locally.
//   Guest (no server account)
//       Device wipe only.
//   Signed in on this device but without a token (an old session that still
//   needs a sign-in code)
//       Nothing is deleted: the server can't be asked without a session, so
//       the user is sent to sign in first.

import { ApiError } from '../api/client';
import { deleteAccountOnServer } from '../api/account';
import { tokenStore } from './secureStore';
import { wipeDeviceForDeletedAccount } from './lifecycle';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { captureEvent } from '../posthog';

export type AccountDeletionResult =
  | { ok: true; scope: 'account' | 'guest' }
  | { ok: false; reason: 'needs_sign_in' | 'session_expired' | 'network' | 'refused' };

export async function deleteAccountEverywhere(): Promise<AccountDeletionResult> {
  let token: string | null;
  try {
    token = await tokenStore.get();
  } catch {
    // Can't tell whether there is a session: delete nothing.
    return fail('network');
  }

  if (!token) {
    const auth = useAuthStore.getState();
    if (auth.isAuthenticated && !auth.isGuest) return fail('needs_sign_in');
    await wipeDeviceForDeletedAccount('guest');
    return { ok: true, scope: 'guest' };
  }

  try {
    await deleteAccountOnServer();
  } catch (err) {
    // 401: the session was rejected (expired, or the account is already gone
    // and the token is stale); client.ts has started the sign-out.
    if (err instanceof ApiError && err.status === 401) return fail('session_expired');
    if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 429) {
      return fail('refused');
    }
    return fail('network');
  }

  await wipeDeviceForDeletedAccount('account');
  return { ok: true, scope: 'account' };
}

function fail(reason: 'needs_sign_in' | 'session_expired' | 'network' | 'refused'): AccountDeletionResult {
  try { captureEvent('account_deletion_failed', { reason }); } catch { /* non-fatal */ }
  return { ok: false, reason };
}
