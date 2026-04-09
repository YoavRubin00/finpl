/**
 * SIM 21: בנה את הסל (Build the ETF Basket) — Module 4-21
 * Types for the ETF basket builder simulation.
 */

export type ETFType = 'stocks' | 'bonds' | 'real-estate' | 'emerging';

export interface ETFProduct {
  id: string;
  name: string; // Hebrew + English
  emoji: string;
  type: ETFType;
  expenseRatio: number; // e.g., 0.03 for 0.03%
  topHoldings: string[];
  annualReturn: number; // average annual return as decimal (e.g., 0.10 for 10%)
  riskLevel: 1 | 2 | 3 | 4 | 5;
}

export interface ETFBuilderConfig {
  availableETFs: ETFProduct[];
  maxETFs: number; // 5
  budget: number; // ₪50,000
}

export interface ETFAllocation {
  etfId: string;
  percent: number; // 0-100
}

export interface ETFBuilderState {
  selectedETFs: ETFAllocation[];
  diversificationScore: number; // 0-100
  estimatedReturn: number;
  estimatedRisk: number;
  isComplete: boolean;
}

export type ETFBuilderGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface ETFBuilderScore {
  grade: ETFBuilderGrade;
  diversification: number;
  geographicSpread: number;
  assetTypeSpread: number;
}
