export type AssetType =
  | 'real_estate'
  | 'commercial'
  | 'energy'
  | 'reit'
  | 'dividend'
  | 'bond';

export interface RealAsset {
  id: string;
  name: string;
  emoji: string;
  type: AssetType;
  tier: 1 | 2 | 3;
  baseCost: number;
  upgradeCost: number;
  dailyYield: number;
  descriptionHebrew: string;
  conceptTag: string;
  purchasedAt?: number;
  lastCollectedAt?: number;
  /** Mortgage: remaining debt to pay off (auto-deducted from daily yield) */
  mortgageRemaining?: number;
}

/** Mortgage terms */
export interface MortgageTerms {
  /** Downpayment percentage (0.3 = 30%) */
  downpayment: number;
  /** Daily interest rate applied to remaining debt */
  dailyInterestRate: number;
  /** Percentage of daily yield auto-deducted for repayment */
  repaymentRate: number;
}

/** Portfolio combo — bonus for owning specific asset pairs */
export interface PortfolioCombo {
  id: string;
  name: string;
  emoji: string;
  requiredAssets: string[];
  yieldBonus: number; // e.g. 0.20 = +20%
  description: string;
}

/** Asset milestone — tracked achievements */
export type MilestoneId =
  | 'first_asset'
  | 'three_assets'
  | 'all_assets'
  | 'first_t2'
  | 'first_t3';

export interface RealAssetsState {
  ownedAssets: Record<string, RealAsset>;
  totalDailyIncome: number;
  lifetimeEarned: number;
  assetMilestones: MilestoneId[];
  assetVouchers: number;

  purchaseAsset: (assetId: string) => boolean;
  purchaseWithMortgage: (assetId: string) => boolean;
  upgradeAsset: (assetId: string) => boolean;
  collectDailyIncome: () => void;
  canCollectToday: () => boolean;
  pendingIncome: () => number;
  getActiveCombos: () => PortfolioCombo[];
  getComboBonus: () => number;
  useVoucher: () => boolean;
  addVoucher: () => void;
  /** Total mortgage debt across all assets */
  totalMortgageDebt: () => number;
}
