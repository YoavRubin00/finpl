// api/_shared/revenueCatVerify.ts
//
// Ask RevenueCat whether an app_user_id has the "FinPlay Pro" entitlement right
// now (REST API v1, GET /subscribers/{app_user_id}). Used by
// /api/sync/subscription before it turns a not-Pro account into Pro.
//
// Keys, first one configured wins:
//   REVENUECAT_SECRET_API_KEY   (v1 secret key, sk_…; recommended)
//   RC_SECRET_API_KEY           (alias)
//   EXPO_PUBLIC_RC_APPLE_KEY / EXPO_PUBLIC_RC_GOOGLE_KEY — the apps' public
//     SDK keys, if they are also set in the server environment. The SDK reads
//     the same endpoint with them.
// Fails safe: no key, a non-200, a timeout or an unreadable body all answer
// 'unavailable' (the caller then does NOT upgrade on the client's word).
//
// No key at all is logged once per instance (console.error): without one, Pro
// bought on an old app bundle waits for the purchase webhook. A key RevenueCat
// refuses (401/403; in production the v1 secret key answers 401, code 7225,
// while the public keys work) is skipped for 10 minutes per instance instead
// of costing one wasted round trip on every verification.

import type { RcVerdict } from './subscriptionSync';

export const RC_PRO_ENTITLEMENT = 'FinPlay Pro';
const RC_TIMEOUT_MS = 3_000;
export const RC_REFUSED_KEY_SKIP_MS = 10 * 60 * 1000;

interface RcKey {
  key: string;
  platform?: 'ios' | 'android';
  /** For logs (never the key itself). */
  label?: string;
}

export function revenueCatKeys(env: NodeJS.ProcessEnv = process.env): RcKey[] {
  const keys: RcKey[] = [];
  const secret = env.REVENUECAT_SECRET_API_KEY ?? env.RC_SECRET_API_KEY;
  if (secret) keys.push({ key: secret, label: 'secret' });
  if (env.EXPO_PUBLIC_RC_APPLE_KEY) keys.push({ key: env.EXPO_PUBLIC_RC_APPLE_KEY, platform: 'ios', label: 'apple public' });
  if (env.EXPO_PUBLIC_RC_GOOGLE_KEY) keys.push({ key: env.EXPO_PUBLIC_RC_GOOGLE_KEY, platform: 'android', label: 'google public' });
  return keys;
}

/** key → time (ms) until which it is skipped. Per instance. */
const refusedKeys = new Map<string, number>();
let warnedNoKey = false;

/** Testing hook. */
export function resetRevenueCatVerifyMemory(): void {
  refusedKeys.clear();
  warnedNoKey = false;
}

function keyUsable(k: RcKey, nowMs: number): boolean {
  return (refusedKeys.get(k.key) ?? 0) <= nowMs;
}

/** Pure: read the Pro entitlement out of a v1 subscriber response. */
export function parseRcSubscriber(json: unknown, nowMs: number): RcVerdict {
  const subscriber = (json as { subscriber?: { entitlements?: Record<string, unknown> } } | null)?.subscriber;
  if (!subscriber || typeof subscriber !== 'object') return { status: 'unavailable', reason: 'no subscriber in answer' };
  const ent = subscriber.entitlements?.[RC_PRO_ENTITLEMENT] as
    | { expires_date?: string | null; grace_period_expires_date?: string | null; product_identifier?: string }
    | undefined;
  if (!ent || typeof ent !== 'object') return { status: 'inactive' };
  const exp = ent.expires_date ?? null;
  const grace = ent.grace_period_expires_date ?? null;
  const expMs = exp ? Date.parse(exp) : null;
  const graceMs = grace ? Date.parse(grace) : null;
  const active =
    exp === null ||
    (expMs !== null && Number.isFinite(expMs) && expMs > nowMs) ||
    (graceMs !== null && Number.isFinite(graceMs) && graceMs > nowMs);
  if (!active) return { status: 'inactive' };
  const promo = typeof ent.product_identifier === 'string' && ent.product_identifier.startsWith('rc_promo');
  return { status: 'active', expiresAt: exp, source: promo ? 'promotional' : 'store' };
}

type FetchLike = (url: string, init: { headers: Record<string, string>; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export async function verifyProWithRevenueCat(
  appUserIds: string[],
  opts: { keys?: RcKey[]; fetchImpl?: FetchLike; nowMs?: number } = {},
): Promise<RcVerdict> {
  const keys = opts.keys ?? revenueCatKeys();
  if (keys.length === 0) {
    if (!warnedNoKey) {
      warnedNoKey = true;
      console.error('[revenuecat-verify] no RevenueCat API key configured: Pro cannot be confirmed on the server, upgrades wait for the purchase webhook');
    }
    return { status: 'unavailable', reason: 'no RevenueCat API key configured' };
  }
  const doFetch = opts.fetchImpl ?? (fetch as unknown as FetchLike);
  const nowMs = opts.nowMs ?? Date.now();
  if (!keys.some((k) => keyUsable(k, nowMs))) {
    return { status: 'unavailable', reason: 'every RevenueCat key was refused in the last 10 minutes' };
  }

  let anyAnswer = false;
  let lastReason = 'no answer';
  for (const id of [...new Set(appUserIds.filter((x) => typeof x === 'string' && x.length > 0 && x.length <= 254))]) {
    for (const k of keys) {
      if (!keyUsable(k, nowMs)) continue; // refused earlier (also earlier in this call)
      try {
        const headers: Record<string, string> = { Authorization: `Bearer ${k.key}`, 'Content-Type': 'application/json' };
        if (k.platform) headers['X-Platform'] = k.platform;
        const res = await doFetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(id)}`, {
          headers,
          signal: AbortSignal.timeout(RC_TIMEOUT_MS),
        });
        if (!res.ok) {
          lastReason = `HTTP ${res.status}`;
          if (res.status === 401 || res.status === 403) {
            // The key itself is refused (not this id): skip it for a while.
            refusedKeys.set(k.key, nowMs + RC_REFUSED_KEY_SKIP_MS);
            console.error(`[revenuecat-verify] the ${k.label ?? 'configured'} key was refused (HTTP ${res.status}): skipped for 10 minutes`);
          }
          continue; // next key
        }
        const verdict = parseRcSubscriber(await res.json(), nowMs);
        if (verdict.status === 'unavailable') {
          lastReason = verdict.reason;
          continue;
        }
        anyAnswer = true;
        if (verdict.status === 'active') return verdict;
        break; // a definite "not Pro" for this id; try the next id
      } catch (err) {
        lastReason = err instanceof Error ? err.message : String(err);
      }
    }
  }
  return anyAnswer ? { status: 'inactive' } : { status: 'unavailable', reason: lastReason };
}
