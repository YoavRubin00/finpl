/**
 * SIM 4-25: בלש הדוחות (Statement Detective), Module 4-25
 * Types for the financial statement analysis simulation.
 */

export interface FinancialSnippet {
  id: string;
  companyName: string;
  emoji: string;
  revenue: number;
  netIncome: number;
  cashFlow: number;
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  peRatio: number;
  debtEquityRatio: number;
  redFlags: string[];
}

export type Verdict = 'invest' | 'avoid';

export interface DetectiveRound {
  snippet: FinancialSnippet;
  correctVerdict: Verdict;
  explanation: string;
}

export interface DetectiveConfig {
  rounds: DetectiveRound[];
  timePerRound: number; // seconds (30)
}

export interface DetectiveState {
  currentRoundIndex: number;
  playerVerdicts: (Verdict | null)[];
  showingFeedback: boolean;
  isComplete: boolean;
}

export interface DetectiveScore {
  correctCount: number;
  totalRounds: number;
  missedRedFlags: string[];
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  gradeLabel: string;
}
