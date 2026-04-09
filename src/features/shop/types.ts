export type ShopCategory = 'hearts' | 'hints' | 'protection' | 'cosmetics' | 'premium' | 'avatars';

export interface ShopItem {
  id: string;
  category: ShopCategory;
  name: string;
  description: string;
  coinCost: number;
  gemCost?: number;
  emoji: string;
  lottieSource?: number;
}

/** IAP gem bundle — real-money purchase (mock flow) */
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

/** Daily deal — rotating discounted shop item */
export interface DailyDeal {
  id: string;
  item: ShopItem;
  originalCost: number;
  discountedCost: number;
  discountPercent: number;
  currency: 'coins' | 'gems';
}

/** Gold bundle — buy coins with gems (Clash Royale style) */
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
