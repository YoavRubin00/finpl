/**
 * SIM: בנה תיק לפי גראהם (Graham Portfolio Builder)
 * Types for the Benjamin Graham value-investing portfolio simulation.
 */

export interface GrahamStock {
  id: string;
  name: string;
  emoji: string;
  sector: string;
  pe: number;
  pb: number;
  dividendYears: number;
  debtToEquity: number;
  earningsGrowth5y: number;
  currentRatio: number;
  yearsOfProfits: number;
  marketCapBillion: number;
}

export interface PortfolioAllocation {
  stockId: string;
  percent: number;
}

export type GrahamGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface GrahamResult {
  totalScore: number;
  grade: GrahamGrade;
  diversificationScore: number;
  valueScore: number;
  safetyScore: number;
  feedback: string;
}
