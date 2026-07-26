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
  /** The CANONICAL invite code registered in the DB (null if none). The store
   *  must adopt this when it differs from the local code — otherwise a stale
   *  local code renders a QR the server resolves to CODE_NOT_FOUND forever. */
  referralCode: string | null;
}

export interface RedeemResult {
  ok: true;
  referrerAuthId: string;
  bonusGranted: number;
}

/** Server rejection codes + client-detected transport failures. */
export type RedeemFailureReason =
  | 'ALREADY_REDEEMED'
  | 'SELF_REFERRAL'
  | 'CODE_NOT_FOUND'
  | 'REFEREE_NOT_FOUND'
  | 'INVALID'
  | 'NETWORK';

export type RedeemOutcome =
  | RedeemResult
  | {
      ok: false;
      reason: RedeemFailureReason;
      /** true = permanent rejection (retrying can never succeed) — caller
       *  should clear any pending-redemption state. false = transient
       *  (network / 5xx / signup race) — caller should retry later. */
      final: boolean;
    };

/** Rejections that can never succeed on retry. REFEREE_NOT_FOUND is NOT here:
 *  it's the race where the user_profiles row hasn't been created yet — the
 *  next launch usually resolves it. */
const FINAL_REDEEM_REASONS: readonly RedeemFailureReason[] =
  ['ALREADY_REDEEMED', 'SELF_REFERRAL', 'CODE_NOT_FOUND', 'INVALID'];

export type RegisterCodeResult =
  | { ok: true; canonicalCode: string | null }
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
    if (res.ok) {
      // The server always answers with the CANONICAL code from the DB. When
      // it differs from what we sent, the DB already holds another code for
      // this user and the caller must adopt it (stale-QR self-heal). Older
      // deploys answered a bare { ok: true } — tolerate a missing field.
      let canonicalCode: string | null = null;
      try {
        const json = (await res.json()) as { ok: true; canonicalCode?: string | null };
        canonicalCode = json.canonicalCode ?? null;
      } catch { /* body parse failure — treat as no canonical info */ }
      return { ok: true, canonicalCode };
    }
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
 * Never throws. Returns a discriminated outcome so callers can tell a FINAL
 * rejection (already redeemed / self-referral / dead code — clear pending
 * state, never retry) from a TRANSIENT failure (network / 5xx / the
 * REFEREE_NOT_FOUND signup race — keep pending state and retry next launch).
 * The old `RedeemResult | null` shape collapsed both into null, which made
 * the _layout pending hook delete the code on temporary failures.
 */
export async function redeemReferralCode(
  inviteCode: string,
  refereeAuthId: string,
): Promise<RedeemOutcome> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/api/referral/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode, refereeAuthId }),
    });
    if (res.ok) {
      return (await res.json()) as RedeemResult;
    }
    // 4xx carries a machine-readable `code`; 5xx / rate-limit are transient.
    let reason: RedeemFailureReason = res.status >= 500 || res.status === 429 ? 'NETWORK' : 'INVALID';
    try {
      const json = (await res.json()) as { code?: string };
      const known: readonly RedeemFailureReason[] =
        ['ALREADY_REDEEMED', 'SELF_REFERRAL', 'CODE_NOT_FOUND', 'REFEREE_NOT_FOUND'];
      if (json.code && (known as readonly string[]).includes(json.code)) {
        reason = json.code as RedeemFailureReason;
      }
    } catch { /* unparseable body — keep the status-based reason */ }
    return { ok: false, reason, final: FINAL_REDEEM_REASONS.includes(reason) };
  } catch {
    // Thrown fetch = offline / DNS / aborted — transient by definition.
    return { ok: false, reason: 'NETWORK', final: false };
  }
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
    referralCode: json.referralCode ?? null,
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
