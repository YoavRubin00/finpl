import { getApiBase } from '../apiBase';
import type { CoinEventSource } from '../../features/social/referralConstants';

/**
 * Append a coin grant event to the server log.
 *
 * This is TELEMETRY for the referral dividend — the local economy store
 * (`useEconomyStore.addCoins`) remains the source of truth for the user's
 * actual balance. We log here so the dividend has data to compute from
 * (only `lesson` / `quiz` / `daily-quest` count toward the 5% pool).
 *
 * Fire-and-forget — failures are silently dropped. The user's actual coin
 * balance is unaffected by network/server issues.
 */
export async function logCoinGrant(
  authId: string,
  amount: number,
  source: CoinEventSource,
): Promise<void> {
  if (!authId || amount <= 0) return;
  try {
    const base = getApiBase();
    await fetch(`${base}/api/economy/grant-coins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authId, amount, source }),
    });
  } catch { /* fire-and-forget */ }
}
