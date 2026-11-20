import { api, ApiError } from '../../lib/api/client';
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
 * Tells the server "this user is active today" (last_active_date + the same
 * streak advance as /api/sync/streak).
 *
 * Goes through the shared API client, which attaches the session token; the
 * server acts on the token's user and refuses tokenless pings (since
 * 2026-11-20). Without a token (guest, or a session that still needs a sign-in
 * code) the client answers 401 locally and nothing is sent. `authId` is still
 * sent so a server older than that change keeps working.
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
    await api.post<{ authId: string }, { ok: boolean }>('/api/users/ping', { authId });
    lastPingedKey = key;
  } catch (err) {
    if (__DEV__ && !(err instanceof ApiError && err.status === 401)) {
      console.warn('[pingActiveToday] failed', err);
    }
  } finally {
    if (inFlightKey === key) inFlightKey = null;
  }
}
