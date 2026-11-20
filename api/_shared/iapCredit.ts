// api/_shared/iapCredit.ts
//
// What a RevenueCat consumable purchase (NON_RENEWING_PURCHASE) is worth, by
// store product id. The RevenueCat webhook is the ONLY path that credits
// purchased gems (since 2026-11-20 /api/sync/economy drops purchase-sized gem
// deltas). Product ids: src/services/revenueCat.ts GEM_PRODUCT_IDS.
//
//   finplay_gems_<N>            → N gems (80 / 500 / 1,200 / 2,500 / 6,500 / 14,000)
//   finplay_starter_pack_19_90  → that Israel day's pack (src/features/shop/
//                                 starterPack.ts): its gems are credited here;
//                                 its coins go into the user's returns pool,
//                                 which the app's own coin credit then claims
//                                 (the app adds the pack's coins itself and
//                                 always has; crediting them here too would
//                                 pay them twice).
// Before this file the webhook read the trailing digits of ANY product id, so
// the starter pack ("…_19_90") credited 90 gems on top of the app's own grant.

import { getTodaysStarterPack, STARTER_PACK_PRODUCT_ID } from '../../src/features/shop/starterPack';

export const MAX_GEMS_PER_PURCHASE = 20_000;

export interface PurchaseCredit {
  kind: 'gem_bundle' | 'starter_pack';
  gems: number;
  /** Coins added to the returns pool (not credited directly). */
  poolCoins: number;
}

export function creditForProduct(productId: unknown, purchasedAtMs: unknown, nowMs: number): PurchaseCredit | null {
  if (typeof productId !== 'string') return null;
  if (productId === STARTER_PACK_PRODUCT_ID) {
    const at = typeof purchasedAtMs === 'number' && Number.isFinite(purchasedAtMs) ? purchasedAtMs : nowMs;
    const pack = getTodaysStarterPack(new Date(at));
    return { kind: 'starter_pack', gems: pack.gems, poolCoins: pack.coins };
  }
  const m = /^finplay_gems_(\d{1,6})$/.exec(productId);
  if (m) {
    const gems = parseInt(m[1], 10);
    if (gems > 0 && gems <= MAX_GEMS_PER_PURCHASE) return { kind: 'gem_bundle', gems, poolCoins: 0 };
  }
  return null;
}

/** Candidate account keys from a webhook event: app_user_id first, then the
 *  original id and aliases (a purchase made before the SDK logIn finished is
 *  reported under an anonymous id that is later aliased to the account). */
export function candidateUserKeys(event: {
  app_user_id?: unknown;
  original_app_user_id?: unknown;
  aliases?: unknown;
}): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v !== 'string') return;
    const s = v.trim();
    if (!s || s.startsWith('$RCAnonymousID') || s.length > 254) return;
    if (!out.includes(s)) out.push(s);
  };
  push(event.app_user_id);
  push(event.original_app_user_id);
  if (Array.isArray(event.aliases)) event.aliases.forEach(push);
  return out;
}
