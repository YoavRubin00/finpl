export type CompetitionPhase = 'pre_draft' | 'draft' | 'competition' | 'results';
export type FantasyTier = 'silver' | 'gold' | 'diamond';
export type StockCategoryId = 'tech' | 'spec_growth' | 'energy' | 'israel' | 'crypto';

export type Currency = '$' | '₪';

export interface TierConfig {
  id: FantasyTier;
  label: string;
  emoji: string;
  entryCost: number;
  prizeMultipliers: [number, number, number, number, number];
  prizeXP: [number, number, number, number, number];
  /** Diamonds awarded for 1st-5th place; later slots typically 0. */
  prizeDiamonds: [number, number, number, number, number];
}

export interface DraftStock {
  ticker: string;
  name: string;
  tagline: string;
  categoryId: StockCategoryId;
  mockPrice: number;
  mockWeeklyChange: number;
  sharkAnalysis: string;
  currency?: Currency;
}

export interface StockCategory {
  id: StockCategoryId;
  label: string;
  emoji: string;
  description: string;
  stocks: DraftStock[];
}

export interface DraftPick {
  categoryId: StockCategoryId;
  ticker: string;
  stockName: string;
  entryPrice: number;
  finalPrice: number | null;
  returnPercent: number | null;
  /** Coins allocated to this pick — sum across all picks equals entry pool. */
  allocation: number;
}

export interface WeeklyEntry {
  weekId: string;
  tier: FantasyTier;
  coinsPaid: number;
  picks: DraftPick[];
  lockedAt: string | null;
  finalRank: number | null;
  coinsReturned: number | null;
  xpEarned: number | null;
  claimed: boolean;
  draftStreakWeeks: number;
  /** FPL-style captain — ticker doubles its points contribution. */
  captainTicker: string | null;
  /** Vice captain — ×1.5 fallback when captain underperforms. */
  viceTicker: string | null;
}

export interface FantasyLeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  returnPercent: number;
  isLocal: boolean;
  change: '+1' | '-1' | 'new' | 'same';
  leaguePosition: 'promoted' | 'demoted' | 'stable';
}

export interface WeeklyMission {
  id: string;
  description: string;
  bonusXP: number;
  completed: boolean;
}