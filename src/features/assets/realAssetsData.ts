import type { RealAsset, PortfolioCombo, MortgageTerms } from './realAssetsTypes';

/**
 * Mortgage (משכנתא), real financial education
 * - 30% downpayment (מקדמה), you pay 30% upfront, borrow 70%
 * - 0.05% daily interest on remaining debt (~18% annual, like real consumer credit)
 * - 60% of daily yield auto-deducted for repayment (שירות חוב)
 * - Net income while paying = 40% of yield
 * - Once paid off = 100% yield
 */
export const MORTGAGE_TERMS: MortgageTerms = {
  downpayment: 0.30,
  dailyInterestRate: 0.0005,
  repaymentRate: 0.60,
};

/** Base asset definitions (tier 1). Upgrade cost = 60% of baseCost per tier. */
const BASE_ASSETS: Omit<RealAsset, 'purchasedAt' | 'lastCollectedAt'>[] = [
  {
    id: 'apartment',
    name: 'דירה להשכרה',
    emoji: '🏠',
    type: 'real_estate',
    tier: 1,
    baseCost: 5_000,
    upgradeCost: 3_000,
    dailyYield: 67,
    descriptionHebrew:
      'דירה להשכרה שמייצרת הכנסה חודשית קבועה. שכר דירה הוא אחד ממקורות ההכנסה הפסיבית הנפוצים ביותר בעולם.',
    conceptTag: 'שכר דירה, תשואת נדל"ן',
  },
  {
    id: 'shop',
    name: 'חנות מסחרית',
    emoji: '🏪',
    type: 'commercial',
    tier: 1,
    baseCost: 3_200,
    upgradeCost: 1_920,
    dailyYield: 49,
    descriptionHebrew:
      'חנות מסחרית עם שוכר קבוע. נדל"ן מסחרי מניב בדרך כלל תשואה גבוהה יותר מדירה, אך עם סיכון גבוה יותר.',
    conceptTag: 'נדל"ן מסחרי, תזרים עסקי',
  },
  {
    id: 'solar',
    name: 'פאנלים סולאריים',
    emoji: '☀️',
    type: 'energy',
    tier: 1,
    baseCost: 1_800,
    upgradeCost: 1_080,
    dailyYield: 23,
    descriptionHebrew:
      'מערכת אנרגיה סולארית שמייצרת חשמל ומוכרת אותו לרשת. נכס ייצורי עם תשואה יציבה לאורך זמן.',
    conceptTag: 'אנרגיה מתחדשת, נכס ייצורי',
  },
  {
    id: 'reit',
    name: 'קרן נדל"ן (REIT)',
    emoji: '🏢',
    type: 'reit',
    tier: 1,
    baseCost: 2_500,
    upgradeCost: 1_500,
    dailyYield: 36,
    descriptionHebrew:
      'קרן שמשקיעה בנדל"ן ומחלקת רווחים. מאפשרת להשקיע בנדל"ן בלי לקנות נכס שלם, פיזור סיכון עם נזילות.',
    conceptTag: 'REIT, פיזור בנדל"ן',
  },
  {
    id: 'dividend_portfolio',
    name: 'תיק דיבידנדים',
    emoji: '📊',
    type: 'dividend',
    tier: 1,
    baseCost: 1_500,
    upgradeCost: 900,
    dailyYield: 18,
    descriptionHebrew:
      'תיק מניות שמחלקות דיבידנד קבוע. הכנסה פסיבית ממניות, ללא צורך למכור.',
    conceptTag: 'מניות דיבידנד, הכנסה פסיבית',
  },
  {
    id: 'gov_bond',
    name: 'אג"ח ממשלתי',
    emoji: '🏦',
    type: 'bond',
    tier: 1,
    baseCost: 800,
    upgradeCost: 480,
    dailyYield: 9,
    descriptionHebrew:
      'הלוואה למדינה עם ריבית קבועה. הנכס הכי בטוח, סיכון נמוך, תשואה נמוכה. בסיס לכל תיק השקעות.',
    conceptTag: 'אג"ח, נכס בטוח-סיכון נמוך',
  },
] as const;

/** Tier multiplier: T1 = 1x, T2 = 1.5x, T3 = 2.25x (50% increase per tier) */
const TIER_MULTIPLIER: Record<1 | 2 | 3, number> = {
  1: 1,
  2: 1.5,
  3: 2.25,
} as const;

/** Get the daily yield for an asset at a given tier */
export function getYieldForTier(baseYield: number, tier: 1 | 2 | 3): number {
  return Math.round(baseYield * TIER_MULTIPLIER[tier] * 100) / 100;
}

/** Get a fresh copy of a base asset by ID */
export function getBaseAsset(assetId: string): RealAsset | undefined {
  const base = BASE_ASSETS.find((a) => a.id === assetId);
  if (!base) return undefined;
  return { ...base };
}

/** All base asset IDs */
export const ASSET_IDS = BASE_ASSETS.map((a) => a.id);

/** Catalog for display, all 6 base assets (tier 1) */
export const ASSET_CATALOG: readonly Omit<RealAsset, 'purchasedAt' | 'lastCollectedAt'>[] =
  BASE_ASSETS;

/** Starter capital granted after onboarding */
export const STARTER_CAPITAL = 500;

/** Portfolio combos, bonuses for owning specific asset combinations */
export const PORTFOLIO_COMBOS: PortfolioCombo[] = [
  {
    id: 'real_estate_combo',
    name: 'נדל"ן מגוון',
    emoji: '🏘️',
    requiredAssets: ['apartment', 'shop'],
    yieldBonus: 0.20,
    description: 'בעלות על דירה + חנות = +20% תשואה משולבת',
  },
  {
    id: 'growth_combo',
    name: 'תיק צמיחה',
    emoji: '📈',
    requiredAssets: ['dividend_portfolio', 'reit'],
    yieldBonus: 0.15,
    description: 'דיבידנדים + REIT = +15% תשואה משולבת',
  },
  {
    id: 'green_energy_combo',
    name: 'אנרגיה ירוקה',
    emoji: '🌿',
    requiredAssets: ['solar', 'gov_bond'],
    yieldBonus: 0.10,
    description: 'סולארי + אג"ח = +10% תשואה משולבת',
  },
  {
    id: 'tycoon_combo',
    name: 'המשקיע השלם',
    emoji: '👑',
    requiredAssets: ['apartment', 'shop', 'solar', 'reit', 'dividend_portfolio', 'gov_bond'],
    yieldBonus: 0.25,
    description: 'כל 6 הנכסים = +25% תשואה גלובלית!',
  },
];

/** Calculate ROI days for an asset */
export function calcPaybackDays(cost: number, dailyYield: number): number {
  if (dailyYield <= 0) return Infinity;
  return Math.ceil(cost / dailyYield);
}

/** Get weekly deal asset ID (seeded by week number) */
export function getWeeklyDealAssetId(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  const ids = ASSET_IDS;
  return ids[weekNumber % ids.length];
}

/** Weekly deal discount */
export const WEEKLY_DEAL_DISCOUNT = 0.30;
