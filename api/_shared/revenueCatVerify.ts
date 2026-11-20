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

import type { RcVerdict } from './subscriptionSync';

export const RC_PRO_ENTITLEMENT = 'FinPlay Pro';
const RC_TIMEOUT_MS = 3_000;

interface RcKey {
  key: string;
  platform?: 'ios' | 'android';
}

export function revenueCatKeys(env: NodeJS.ProcessEnv = process.env): RcKey[] {
  const keys: RcKey[] = [];
  const secret = env.REVENUECAT_SECRET_API_KEY ?? env.RC_SECRET_API_KEY;
  if (secret) keys.push({ key: secret });
  if (env.EXPO_PUBLIC_RC_APPLE_KEY) keys.push({ key: env.EXPO_PUBLIC_RC_APPLE_KEY, platform: 'ios' });
  if (env.EXPO_PUBLIC_RC_GOOGLE_KEY) keys.push({ key: env.EXPO_PUBLIC_RC_GOOGLE_KEY, platform: 'android' });
  return keys;
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
  if (keys.length === 0) return { status: 'unavailable', reason: 'no RevenueCat API key configured' };
  const doFetch = opts.fetchImpl ?? (fetch as unknown as FetchLike);
  const nowMs = opts.nowMs ?? Date.now();

  let anyAnswer = false;
  let lastReason = 'no answer';
  for (const id of [...new Set(appUserIds.filter((x) => typeof x === 'string' && x.length > 0 && x.length <= 254))]) {
    for (const k of keys) {
      try {
        const headers: Record<string, string> = { Authorization: `Bearer ${k.key}`, 'Content-Type': 'application/json' };
        if (k.platform) headers['X-Platform'] = k.platform;
        const res = await doFetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(id)}`, {
          headers,
          signal: AbortSignal.timeout(RC_TIMEOUT_MS),
        });
        if (!res.ok) {
          lastReason = `HTTP ${res.status}`;
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
