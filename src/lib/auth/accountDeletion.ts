// src/lib/auth/accountDeletion.ts
//
// Settings → "מחיקת חשבון לצמיתות". Until 2026-11-20 this only cleared
// AsyncStorage: the server account and its data stayed, and the session token
// (in secure storage) survived, so the next cold start signed the user back in.
//
//   Signed in (a session token on this device)
//       POST /api/account/delete. Only when the server answers 200 with
//       { ok: true } (deleted, or already deleted) is the device wiped (token,
//       RevenueCat identity, query cache, every local store and everything
//       persisted, scheduled notifications, PostHog identity).
//       A definite refusal deletes nothing ('not_deleted' / 'session_expired').
//       No answer (network, timeout, 5xx) means the server MAY have deleted
//       the account: the request is sent once more at once (the endpoint is
//       idempotent, so a lost "deleted" comes back as "already deleted"), and
//       if that fails too the user is told the outcome is unknown, never
//       "nothing was deleted" ('unknown'). Decision logic:
//       accountDeletionCore.ts (tested in scripts/test-account-deletion-client.ts).
//   Guest (no server account)
//       Device wipe only.
//   Signed in on this device but without a token (an old session that still
//   needs a sign-in code)
//       Nothing is deleted: the server can't be asked without a session, so
//       the user is sent to sign in first.

import { deleteAccountOnServer } from '../api/account';
import { tokenStore } from './secureStore';
import { wipeDeviceForDeletedAccount } from './lifecycle';
import { runDeleteAttempts } from './accountDeletionCore';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { captureEvent } from '../posthog';

export type AccountDeletionFailure = 'needs_sign_in' | 'session_expired' | 'not_deleted' | 'unknown';

export type AccountDeletionResult =
  | { ok: true; scope: 'account' | 'guest' }
  | { ok: false; reason: AccountDeletionFailure };

export async function deleteAccountEverywhere(): Promise<AccountDeletionResult> {
  let token: string | null;
  try {
    token = await tokenStore.get();
  } catch {
    // Can't tell whether there is a session: send nothing, delete nothing.
    return fail('not_deleted');
  }

  if (!token) {
    const auth = useAuthStore.getState();
    if (auth.isAuthenticated && !auth.isGuest) return fail('needs_sign_in');
    await wipeDeviceForDeletedAccount('guest');
    return { ok: true, scope: 'guest' };
  }

  const { outcome, attempts } = await runDeleteAttempts(deleteAccountOnServer);
  if (outcome === 'session_expired') return fail('session_expired', attempts);
  if (outcome === 'refused') return fail('not_deleted', attempts);
  if (outcome === 'unknown') return fail('unknown', attempts);

  await wipeDeviceForDeletedAccount('account');
  return { ok: true, scope: 'account' };
}

function fail(reason: AccountDeletionFailure, attempts = 0): AccountDeletionResult {
  try { captureEvent('account_deletion_failed', { reason, attempts }); } catch { /* non-fatal */ }
  return { ok: false, reason };
}
