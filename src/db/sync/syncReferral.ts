import { getApiBase } from '../apiBase';

export interface ReferredFriendRow {
  authId: string;
  displayName: string | null;
  linkedAt: string;
  yesterdayLearningCoins: number;
}

export interface ReferralStateSnapshot {
  friends: ReferredFriendRow[];
  totalYesterdayLearningCoins: number;
  dividendAvailable: number;
  alreadyCollectedToday: boolean;
  todayDateUTC: string;
  /** Coins from new referees that the server just flipped to "credited" —
   *  caller MUST call addCoins(pendingSignupBonus) on this exact response. */
  pendingSignupBonus: number;
}

export interface RedeemResult {
  ok: true;
  referrerAuthId: string;
  bonusGranted: number;
}

export type RegisterCodeResult =
  | { ok: true }
  | { ok: false; reason: 'collision' | 'network' | 'invalid' };

/**
 * Register the user's invite code on the server so that other users can
 * redeem it. Idempotent — safe to call repeatedly with the same code.
 *
 * Returns a discriminated result so the caller can distinguish a real
 * code COLLISION (409) — which warrants regenerating the local code —
 * from a transient NETWORK failure (timeout / 5xx / offline) — which
 * absolutely must NOT regenerate the code (user report 2026-06-04:
 * "הקישור להזמנה מתחלף בלי הפסקה" — the boolean-only API caused the
 * store to mint a fresh code on every retry, including network errors,
 * which the screen then re-displayed on every render).
 */
export async function registerReferralCode(
  authId: string,
  referralCode: string,
): Promise<RegisterCodeResult> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/api/referral/register-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authId, referralCode }),
    });
    if (res.ok) return { ok: true };
    if (res.status === 409) return { ok: false, reason: 'collision' };
    if (res.status === 400) return { ok: false, reason: 'invalid' };
    // 5xx / unexpected status — treat as transient, do NOT regenerate.
    return { ok: false, reason: 'network' };
  } catch {
    // Thrown fetch = offline / DNS / aborted — definitely transient.
    return { ok: false, reason: 'network' };
  }
}

/**
 * Redeem an invite code on behalf of the new user. Atomic on the server:
 * creates the referral link AND grants 500 coins to both parties.
 *
 * Throws on network failure. Returns null if the code is unknown / already
 * redeemed by this user / self-referral — caller should show a friendly
 * message.
 */
export async function redeemReferralCode(
  inviteCode: string,
  refereeAuthId: string,
): Promise<RedeemResult | null> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/referral/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteCode, refereeAuthId }),
  });
  if (!res.ok) {
    // 400 / 404 / 409 are user-facing failures, not network failures.
    return null;
  }
  return (await res.json()) as RedeemResult;
}

/** Fetch the user's referral state (friends + pending dividend). */
export async function fetchReferralState(authId: string): Promise<ReferralStateSnapshot | null> {
  const base = getApiBase();
  const res = await fetch(
    `${base}/api/referral/me?authId=${encodeURIComponent(authId)}`,
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { ok: true } & ReferralStateSnapshot;
  return {
    friends: json.friends,
    totalYesterdayLearningCoins: json.totalYesterdayLearningCoins,
    dividendAvailable: json.dividendAvailable,
    alreadyCollectedToday: json.alreadyCollectedToday,
    todayDateUTC: json.todayDateUTC,
    pendingSignupBonus: json.pendingSignupBonus ?? 0,
  };
}

/**
 * Collect today's dividend. Server returns:
 *  - { amount: N, alreadyCollected: false } — first collect today, N coins granted
 *  - { amount: 0, alreadyCollected: true }  — already collected today (or no friends)
 *
 * Returns null on network failure.
 */
export async function collectReferralDividend(authId: string): Promise<{
  amount: number;
  alreadyCollected: boolean;
} | null> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/referral/collect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authId }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { ok: true; amount: number; alreadyCollected?: boolean };
  return { amount: json.amount, alreadyCollected: json.alreadyCollected === true };
}
