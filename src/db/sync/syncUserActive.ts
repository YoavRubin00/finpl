import { getApiBase } from '../apiBase';
import { tokenStore } from '../../lib/auth/secureStore';
import { getIsraelDateISO } from '../../utils/israelTime';

// Once per (user, Israel-local day) per app process. The server treats every
// ping after the first one of the IL day as a pure no-op (`last === today`),
// but the client called it on EVERY mount of the wealth header (each lesson,
// pearl, trading/assets/market screen) — ~5-15 requests a day per user for one
// useful write. Only a SUCCESSFUL ping marks the day done, so a failed one is
// retried on the next mount; a new day or a different user pings again.
let lastPingedKey: string | null = null;
let inFlightKey: string | null = null;

/**
 * Tells the server "this user is active today" by updating
 * `user_profiles.last_active_date = CURRENT_DATE`.
 *
 * Fire-and-forget — the caller should not await this in UI-critical paths.
 * Failures are silently swallowed (logged in dev only) so a flaky network
 * never blocks the app from marking the user active locally.
 */
export async function pingActiveToday(authId: string): Promise<void> {
  const key = `${authId}|${getIsraelDateISO()}`;
  if (key === lastPingedKey || key === inFlightKey) return;
  inFlightKey = key;

  try {
    const base = getApiBase();
    const token = await tokenStore.get();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${base}/api/users/ping`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ authId }),
    });
    if (res.ok) {
      lastPingedKey = key;
    } else if (__DEV__) {
      console.warn(`[pingActiveToday] failed: ${res.status}`);
    }
  } catch (err) {
    if (__DEV__) console.warn('[pingActiveToday] threw', err);
  } finally {
    if (inFlightKey === key) inFlightKey = null;
  }
}
