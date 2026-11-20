// api/_shared/iapCredit.ts
//
// What a RevenueCat consumable purchase (NON_RENEWING_PURCHASE) is worth, by
// store product id. The RevenueCat webhook is the ONLY path that credits
// purchased gems (since 2026-11-20 /api/sync/economy drops purchase-sized gem
// deltas). An explicit table, not a pattern: only the products the app sells
// credit anything. Any other id credits nothing and is recorded for a manual
// check (api/_shared/revenueCatWebhook.ts).
//
//   finplay_gems_80 … finplay_gems_14000
//                               → the six gem bundles (src/services/revenueCat.ts
//                                 GEM_PRODUCT_IDS; amounts from
//                                 src/features/shop/gemBundles.ts, checked by
//                                 scripts/test-economy-sync.ts)
//   finplay_starter_pack_19_90  → that Israel day's pack (src/features/shop/
//                                 starterPack.ts): its gems are credited here;
//                                 its coins go into the user's returns pool,
//                                 which the app's own coin credit then claims
//                                 (the app adds the pack's coins itself and
//                                 always has; crediting them here too would
//                                 pay them twice).
// Before 2026-11-20 the webhook read the trailing digits of ANY product id, so
// the starter pack ("…_19_90") credited 90 gems on top of the app's own grant,
// and "finplay_gems_<any number>" credited that number.

import { getTodaysStarterPack, STARTER_PACK_PRODUCT_ID } from '../../src/features/shop/starterPack';

/** Store product id → gems. */
export const GEM_PRODUCTS: Readonly<Record<string, number>> = Object.freeze({
  finplay_gems_80: 80,
  finplay_gems_500: 500,
  finplay_gems_1200: 1200,
  finplay_gems_2500: 2500,
  finplay_gems_6500: 6500,
  finplay_gems_14000: 14000,
});

export interface PurchaseCredit {
  kind: 'gem_bundle' | 'starter_pack';
  gems: number;
  /** Coins added to the returns pool (not credited directly). */
  poolCoins: number;
}

/** Google Play may report a one-time product as "<product>:<purchase option>";
 *  the product is the part before the colon. */
function baseProductId(productId: string): string {
  const i = productId.indexOf(':');
  return i > 0 ? productId.slice(0, i) : productId;
}

export function creditForProduct(productId: unknown, purchasedAtMs: unknown, nowMs: number): PurchaseCredit | null {
  if (typeof productId !== 'string') return null;
  const id = baseProductId(productId);
  if (id === STARTER_PACK_PRODUCT_ID) {
    const at = typeof purchasedAtMs === 'number' && Number.isFinite(purchasedAtMs) ? purchasedAtMs : nowMs;
    const pack = getTodaysStarterPack(new Date(at));
    return { kind: 'starter_pack', gems: pack.gems, poolCoins: pack.coins };
  }
  if (Object.prototype.hasOwnProperty.call(GEM_PRODUCTS, id)) {
    return { kind: 'gem_bundle', gems: GEM_PRODUCTS[id], poolCoins: 0 };
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
