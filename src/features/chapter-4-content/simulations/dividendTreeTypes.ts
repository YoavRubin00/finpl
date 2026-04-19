/**
 * SIM 23: עץ הדיבידנדים (Dividend Tree), Module 4-23
 * Types for the dividend reinvestment (DRIP) vs cash-out simulation.
 */

export interface DividendYear {
  year: number;
  treeValue: number;
  dividendAmount: number;
  reinvested: boolean;
}

export interface DividendTreeConfig {
  initialInvestment: number; // ₪10,000
  dividendYield: number; // 0.03 (3%)
  stockGrowth: number; // 0.07 (7%)
  years: number; // 20
}

export interface DividendTreeState {
  currentYear: number;
  eatTree: {
    value: number;
    totalDividendsTaken: number;
  };
  plantTree: {
    value: number;
  };
  isPlaying: boolean;
  isComplete: boolean;
}

export interface DividendTreeScore {
  eatTotal: number; // value + total dividends taken
  plantTotal: number; // reinvested value
  difference: number; // plantTotal - eatTotal
}
