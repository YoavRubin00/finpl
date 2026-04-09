/**
 * SIM 4-28: קורא הגרפים (Chart Reader) — Module 4-28
 * Types for the candlestick chart reading simulation.
 */

export interface CandleData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export type ChartAction = 'buy' | 'sell' | 'hold';

export interface ChartRound {
  id: string;
  candles: CandleData[];
  volumeData: number[];
  correctAction: ChartAction;
  companyName: string;
  whatHappened: string;
  pattern: string;
}

export interface ChartReaderConfig {
  rounds: ChartRound[];
}

export interface ChartReaderState {
  currentRoundIndex: number;
  playerActions: (ChartAction | null)[];
  showingReveal: boolean;
  isComplete: boolean;
}

export interface ChartReaderScore {
  correctCount: number;
  totalRounds: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  gradeLabel: string;
}
