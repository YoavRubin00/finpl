export interface FantasyLeague {
  id: string;
  name: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  budgetPerPlayer: number; // Fantasy Cash
  status: 'active' | 'upcoming' | 'ended';
}

export interface FantasyPosition {
  id: string;
  assetId: string; // ticker
  assetName: string;
  quantity: number; // shares
  buyPrice: number;
  currentPrice: number;
  pnlPercent: number;
}

export interface FantasyPortfolio {
  leagueId: string;
  playerId: string;
  startingBudget: number;
  cashRemaining: number;
  positions: FantasyPosition[];
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  portfolioValue: number;
  pnlPercent: number;
  change: '+1' | '-1' | 'new';
}

export interface FantasyState {
  currentLeague: FantasyLeague | null;
  portfolio: FantasyPortfolio | null;
  leaderboard: LeaderboardEntry[];
  lastUpdated: string | null; // ISO 8601
}
