export type CompetitionPhase = 'pre_draft' | 'draft' | 'competition' | 'results';
export type FantasyTier = 'silver' | 'gold' | 'diamond';
export type StockCategoryId = 'tech' | 'banks' | 'energy' | 'health' | 'crypto';

export interface TierConfig {
  id: FantasyTier;
  label: string;
  emoji: string;
  entryCost: number;
  prizeMultipliers: [number, number, number, number, number];
  prizeXP: [number, number, number, number, number];
}

export interface DraftStock {
  ticker: string;
  name: string;
  tagline: string;
  categoryId: StockCategoryId;
  mockPrice: number;
  mockWeeklyChange: number;
  sharkAnalysis: string;
}

export interface StockCategory {
  id: StockCategoryId;
  label: string;
  emoji: string;
  stocks: DraftStock[];
}

export interface DraftPick {
  categoryId: StockCategoryId;
  ticker: string;
  stockName: string;
  entryPrice: number;
  finalPrice: number | null;
  returnPercent: number | null;
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