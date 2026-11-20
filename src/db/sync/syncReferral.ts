import { api, ApiError } from '../../lib/api/client';

// Every referral call goes through the shared API client, which attaches the
// session token. Since 2026-11-20 the server acts on the token's user and
// refuses me / collect / redeem without one (api/_shared/referral.ts); without
// a session (guest, or a session that still needs a sign-in code) the client
// answers 401 locally and nothing is sent.

export interface ReferredFriendRow {
  /** Opaque per-friend key, used as a list key. (Before 2026-11-20 it was the
   *  friend's auth_id, i.e. their email; the field name stayed.) */
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
  /** Always '' since 2026-11-20 (it used to leak the referrer's email). */
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
 *
 * Goes through the shared API client, which attaches the session token; the
 * server registers the code on the token's user (since 2026-11-20). Without a
 * token (guest, or a session that still needs a sign-in code) the client
 * answers 401 locally, nothing is sent, and the result is a transient
 * 'network' failure — the code is kept and retried later. `authId` is still
 * sent so a server older than that change keeps working.
 */
export async function registerReferralCode(
  authId: string,
  referralCode: string,
): Promise<RegisterCodeResult> {
  try {
    const json = await api.post<
      { authId: string; referralCode: string },
      { ok: true; canonicalCode?: string | null } | null
    >('/api/referral/register-code', { authId, referralCode });
    // The server always answers with the CANONICAL code from the DB. When
    // it differs from what we sent, the DB already holds another code for
    // this user and the caller must adopt it (stale-QR self-heal). Older
    // deploys answered a bare { ok: true } — tolerate a missing field.
    return { ok: true, canonicalCode: json?.canonicalCode ?? null };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 409) return { ok: false, reason: 'collision' };
      if (err.status === 400) return { ok: false, reason: 'invalid' };
    }
    // 401 (no session) / 5xx / unexpected status / offline / unparseable body —
    // treat as transient, do NOT regenerate.
    return { ok: false, reason: 'network' };
  }
}

const KNOWN_REDEEM_CODES: readonly RedeemFailureReason[] =
  ['ALREADY_REDEEMED', 'SELF_REFERRAL', 'CODE_NOT_FOUND', 'REFEREE_NOT_FOUND'];

/**
 * Redeem an invite code for the signed-in user. Atomic on the server: creates
 * the referral link AND grants 500 coins to both parties. The referee is the
 * session's user; `refereeAuthId` is still sent so a server from before
 * 2026-11-20 keeps working (the current one only checks it names the same user).
 *
 * Never throws. Returns a discriminated outcome so callers can tell a FINAL
 * rejection (already redeemed / self-referral / dead code — clear pending
 * state, never retry) from a TRANSIENT failure (network / 5xx / no usable
 * session — keep pending state and retry next launch).
 * The old `RedeemResult | null` shape collapsed both into null, which made
 * the _layout pending hook delete the code on temporary failures.
 */
export async function redeemReferralCode(
  inviteCode: string,
  refereeAuthId: string,
): Promise<RedeemOutcome> {
  try {
    const json = await api.post<{ inviteCode: string; refereeAuthId: string }, RedeemResult>(
      '/api/referral/redeem',
      { inviteCode, refereeAuthId },
    );
    return json;
  } catch (err) {
    if (!(err instanceof ApiError)) {
      // Offline / DNS / aborted / unparseable answer — transient by definition.
      return { ok: false, reason: 'NETWORK', final: false };
    }
    // No session here yet (or it was rejected and is being signed out), a
    // refused authId (stale local identity), rate limit, 5xx: keep the invite
    // and retry on a later launch, when there is a session.
    if (err.status === 401 || err.status === 403 || err.status === 429 || err.status >= 500) {
      return { ok: false, reason: 'NETWORK', final: false };
    }
    // Other 4xx carry a machine-readable `code`.
    const code = (err.body as { code?: unknown } | null)?.code;
    const reason: RedeemFailureReason =
      typeof code === 'string' && (KNOWN_REDEEM_CODES as readonly string[]).includes(code)
        ? (code as RedeemFailureReason)
        : 'INVALID';
    return { ok: false, reason, final: FINAL_REDEEM_REASONS.includes(reason) };
  }
}

/**
 * Fetch the signed-in user's referral state (friends + pending dividend).
 * null on any failure (no session, offline, 5xx): callers keep what they have.
 * The server knows the user from the session token; no email in the URL.
 */
export async function fetchReferralState(): Promise<ReferralStateSnapshot | null> {
  try {
    const json = await api.get<({ ok: true } & ReferralStateSnapshot) | null>('/api/referral/me');
    if (!json) return null;
    return {
      friends: json.friends,
      totalYesterdayLearningCoins: json.totalYesterdayLearningCoins,
      dividendAvailable: json.dividendAvailable,
      alreadyCollectedToday: json.alreadyCollectedToday,
      todayDateUTC: json.todayDateUTC,
      pendingSignupBonus: json.pendingSignupBonus ?? 0,
      referralCode: json.referralCode ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Collect today's dividend for the signed-in user. Server returns:
 *  - { amount: N, alreadyCollected: false } — first collect today, N coins granted
 *  - { amount: 0, alreadyCollected: true }  — already collected today (or no friends)
 *
 * Returns null on any failure (no session, offline, 5xx). `authId` is still
 * sent for a server from before 2026-11-20; the current one only checks it.
 */
export async function collectReferralDividend(authId: string): Promise<{
  amount: number;
  alreadyCollected: boolean;
} | null> {
  try {
    const json = await api.post<
      { authId: string },
      { ok: true; amount: number; alreadyCollected?: boolean } | null
    >('/api/referral/collect', { authId });
    if (!json) return null;
    return { amount: json.amount, alreadyCollected: json.alreadyCollected === true };
  } catch {
    return null;
  }
}
