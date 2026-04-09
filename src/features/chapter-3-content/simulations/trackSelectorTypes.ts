/**
 * SIM 3-18: בוחר המסלולים (Track Selector) — Module 3-18
 * Types for the investment track comparison simulation.
 */

export interface InvestmentTrack {
  id: string;
  name: string;
  emoji: string;
  stockPercent: number;
  bondPercent: number;
  annualFeePercent: number;
}

export interface MarketYear {
  year: number;
  stockReturn: number;
  bondReturn: number;
}

export interface TrackSelectorConfig {
  tracks: InvestmentTrack[];
  marketYears: MarketYear[];
  initialInvestment: number; // 100,000
}

export interface TrackSelectorState {
  selectedTrackId: string | null;
  yearIndex: number;
  balanceByTrack: Record<string, number[]>;
  isPlaying: boolean;
  isComplete: boolean;
}

export interface TrackSelectorScore {
  balances: Record<string, number>;
  feesLost: Record<string, number>;
  bestTrack: string;
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  gradeLabel: string;
}
