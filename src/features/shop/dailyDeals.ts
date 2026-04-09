import type { DailyDeal, ShopCategory, ShopItem } from './types';
import { SHOP_ITEMS } from './shopItems';

/* ── Free daily gems item (always first deal) ── */
const FREE_GEMS_ITEM: ShopItem = {
  id: 'free-daily-gems',
  category: 'premium',
  name: '5 יהלומים חינם!',
  description: 'מתנה יומית — היכנס כל יום לאסוף!',
  coinCost: 0,
  gemCost: 0,
  emoji: '💎',
  lottieSource: require('../../../assets/lottie/Diamond.json'),
};

/* ── Seeded random (LCG) ── */
function hashDateString(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function createSeededRandom(seed: number) {
  let state = seed;
  return (): number => {
    state = (state * 1664525 + 1013904223) | 0;
    return (state >>> 0) / 0x100000000;
  };
}

/* ── Category buckets for diversity constraints ── */
const HEARTS_HINTS_CATS: ReadonlySet<ShopCategory> = new Set(['hearts', 'hints']);
const PROTECTION_CATS: ReadonlySet<ShopCategory> = new Set(['protection']);
const COSMETICS_AVATAR_CATS: ReadonlySet<ShopCategory> = new Set(['cosmetics', 'avatars']);

function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function discountForItem(rng: () => number): number {
  // 20-50% discount in increments of 5
  const steps = [20, 25, 30, 35, 40, 45, 50];
  return steps[Math.floor(rng() * steps.length)];
}

/**
 * Generate 4 daily deals for a given ISO date string (e.g. "2026-03-12").
 * Deterministic: same date always produces the same deals.
 */
export function generateDailyDeals(date: string): DailyDeal[] {
  const seed = hashDateString(date);
  const rng = createSeededRandom(seed);

  const heartsHintsItems = SHOP_ITEMS.filter((i) => HEARTS_HINTS_CATS.has(i.category));
  const protectionItems = SHOP_ITEMS.filter((i) => PROTECTION_CATS.has(i.category));
  const cosmeticsAvatarItems = SHOP_ITEMS.filter((i) => COSMETICS_AVATAR_CATS.has(i.category));

  // Guarantee 1 from each required bucket
  const guaranteed = [
    pickRandom(heartsHintsItems, rng),
    pickRandom(protectionItems, rng),
    pickRandom(cosmeticsAvatarItems, rng),
  ];

  // 4th item: pick from all items, excluding already-selected IDs
  const usedIds = new Set(guaranteed.map((i) => i.id));
  const remaining = SHOP_ITEMS.filter((i) => !usedIds.has(i.id));
  guaranteed.push(pickRandom(remaining, rng));

  // Shuffle the 4 items so the order varies per day
  for (let i = guaranteed.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [guaranteed[i], guaranteed[j]] = [guaranteed[j], guaranteed[i]];
  }

  const regularDeals = guaranteed.map((item) => {
    const discount = discountForItem(rng);
    const isGemItem = item.coinCost === 0 && item.gemCost !== undefined;
    const originalCost = isGemItem ? item.gemCost! : item.coinCost;
    const discountedCost = Math.max(1, Math.round(originalCost * (1 - discount / 100)));

    return {
      id: `deal-${date}-${item.id}`,
      item,
      originalCost,
      discountedCost,
      discountPercent: discount,
      currency: isGemItem ? 'gems' : 'coins',
    } satisfies DailyDeal;
  });

  // Always prepend free 25 gems deal
  const freeGemsDeal: DailyDeal = {
    id: `deal-${date}-free-gems`,
    item: FREE_GEMS_ITEM,
    originalCost: 5,
    discountedCost: 0,
    discountPercent: 100,
    currency: 'gems',
  };

  return [freeGemsDeal, ...regularDeals];
}
