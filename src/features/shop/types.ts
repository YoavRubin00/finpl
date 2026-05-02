export type ShopCategory = 'hearts' | 'hints' | 'protection' | 'boosts' | 'cosmetics' | 'premium' | 'avatars';

/** Active temporary booster (Coin Master / Brawl Stars pattern).
 *  Multiplies XP / coins / quest rewards while active.
 *  Expires automatically — `cleanupExpiredBoosts()` should run on read. */
export interface ActiveBoost {
  /** Matches the shop item id that activated it (e.g. 'boost-xp-2x-1h'). */
  id: string;
  /** Epoch ms when the boost expires. */
  expiresAt: number;
  /** Multiplier applied to `addXP` while active. 1.0 = no effect. */
  xpMultiplier?: number;
  /** Multiplier applied to `addCoins` (lesson/quest/daily-quest sources only). */
  coinMultiplier?: number;
  /** Multiplier applied to claimed quest rewards (xp + coins). */
  questRewardMultiplier?: number;
}

export interface ShopItem {
  id: string;
  category: ShopCategory;
  name: string;
  description: string;
  coinCost: number;
  gemCost?: number;
  emoji: string;
  lottieSource?: number;
  /** Public image URL — preferred over lottie/emoji when present (used by avatar shark items). */
  imageUrl?: string;
}

/** IAP gem bundle, real-money purchase (mock flow) */
export interface GemBundle {
  id: string;
  name: string;
  gems: number;
  priceILS: number;
  priceLabel: string;   // e.g. "₪9.90"
  emoji: string;
  lottieSource?: number;
  isBestValue?: boolean;
  bonusLabel?: string;  // e.g. "+25% בונוס"
  isPromo?: boolean;
}

/** Daily deal, rotating discounted shop item */
export interface DailyDeal {
  id: string;
  item: ShopItem;
  originalCost: number;
  discountedCost: number;
  discountPercent: number;
  currency: 'coins' | 'gems';
}

/** Gold bundle, buy coins with gems (Clash Royale style) */
export interface CoinBundle {
  id: string;
  name: string;
  coins: number;
  gemCost: number;
  emoji: string;
  lottieSource?: number;
  isBestValue?: boolean;
  bonusLabel?: string;  // e.g. "+40% בונוס"
}
