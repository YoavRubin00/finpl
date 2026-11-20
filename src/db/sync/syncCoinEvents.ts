import { api } from '../../lib/api/client';
import type { CoinEventSource } from '../../features/social/referralConstants';

/** Sources /api/economy/grant-coins accepts from clients (the referral-* rows
 *  are written by the referral endpoints themselves). Anything else is a
 *  guaranteed 400, so it isn't sent. */
const CLIENT_LOGGED_SOURCES: ReadonlySet<CoinEventSource> = new Set<CoinEventSource>([
  'lesson',
  'quiz',
  'daily-quest',
  'signup-bonus',
]);

/**
 * Append a coin grant event to the server log.
 *
 * This is TELEMETRY for the referral dividend — the economy (`addCoins` →
 * /api/sync/economy) remains the source of truth for the user's actual
 * balance. We log here so the dividend has data to compute from (only
 * `lesson` / `quiz` / `daily-quest` count toward the 5% pool).
 *
 * Goes through the shared API client, which attaches the session token; the
 * server records the row for the token's user, with per-source daily caps.
 * Without a token (guest) the client answers 401 locally and nothing is sent.
 * `authId` is still sent so a server older than 2026-11-20 keeps working.
 *
 * Fire-and-forget — failures are silently dropped. The user's actual coin
 * balance is unaffected by network/server issues.
 */
export async function logCoinGrant(
  authId: string,
  amount: number,
  source: CoinEventSource,
): Promise<void> {
  if (!authId || amount <= 0 || !CLIENT_LOGGED_SOURCES.has(source)) return;
  try {
    await api.post<{ authId: string; amount: number; source: CoinEventSource }, { ok: boolean }>(
      '/api/economy/grant-coins',
      { authId, amount, source },
    );
  } catch { /* fire-and-forget */ }
}
