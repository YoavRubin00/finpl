export type BenefitCategory =
  | 'bank-accounts'
  | 'investments'
  | 'insurance'
  | 'credit-cards'
  | 'education';

export const CATEGORY_LABELS: Record<BenefitCategory, string> = {
  'bank-accounts': '🏦 חשבונות בנק',
  'investments': '📈 השקעות',
  'insurance': '🛡️ ביטוח',
  'credit-cards': '💳 כרטיסי אשראי',
  'education': '📚 השכלה',
};

export interface Benefit {
  id: string;
  title: string;
  description: string;
  partnerName: string;
  partnerLogo: string; // emoji for now
  lottieSource?: number;
  costCoins: number;
  category: BenefitCategory;
  isAvailable: boolean;
  /** What the user gets */
  reward: string;
  /** Pro-only benefit? */
  proOnly?: boolean;
  /** Direct link to partner's website */
  partnerUrl?: string;
  /** Is this a real partner advertisement? */
  isPartnerAd?: boolean;
  /** Is this a placeholder slot waiting for a real partner? */
  partnerAdSlot?: boolean;
}
