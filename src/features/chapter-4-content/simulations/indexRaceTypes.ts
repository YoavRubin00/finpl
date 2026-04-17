/**
 * SIM 4-30: המרוץ נגד המדד (Index Race) — Module 4-30
 * Types for the stock-picking vs index benchmark simulation.
 */

export interface StockOption {
  id: string;
  name: string;
  emoji: string;
  sector: string;
  annualReturns: number[]; // 10 entries (one per year)
}

export interface IndexRaceConfig {
  stockOptions: StockOption[];
  pickCount: number; // 5
  years: number; // 10
  indexReturns: number[]; // 10 entries (‎S&P‎ 500 benchmark)
  initialInvestment: number; // 100000
}

export type RacePhase = 'pick' | 'race' | 'complete';

export interface IndexRaceState {
  phase: RacePhase;
  selectedStockIds: string[];
  portfolioValueByYear: number[];
  indexValueByYear: number[];
  currentYear: number;
  isPlaying: boolean;
}

export interface IndexRaceScore {
  portfolioFinal: number;
  indexFinal: number;
  differencePercent: number;
  beatIndex: boolean;
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  gradeLabel: string;
}
