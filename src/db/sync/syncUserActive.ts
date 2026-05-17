import { getApiBase } from '../apiBase';
import { useAuthStore } from '../../features/auth/useAuthStore';

/**
 * Tells the server "this user is active today" by updating
 * `user_profiles.last_active_date = CURRENT_DATE`.
 *
 * Fire-and-forget — the caller should not await this in UI-critical paths.
 * Failures are silently swallowed (logged in dev only) so a flaky network
 * never blocks the app from marking the user active locally.
 */
export async function pingActiveToday(authId: string): Promise<void> {
  const base = getApiBase();
  const token = useAuthStore.getState().syncToken;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-Sync-Token'] = token;

  try {
    const res = await fetch(`${base}/api/users/ping`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ authId }),
    });
    if (!res.ok && __DEV__) {
      console.warn(`[pingActiveToday] failed: ${res.status}`);
    }
  } catch (err) {
    if (__DEV__) console.warn('[pingActiveToday] threw', err);
  }
}
