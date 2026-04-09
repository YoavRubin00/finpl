/**
 * SIM 19: סליידר הסיכון (Risk-Return Slider) — Module 4-19
 * Types for the risk-return allocation slider simulation.
 */

export interface AllocationMix {
  stockPercent: number;
  bondPercent: number;
}

export interface YearReturn {
  year: number;
  stockReturn: number;
  bondReturn: number;
  mixedReturn: number;
  balance: number;
}

export interface RiskSliderConfig {
  initialInvestment: number; // ₪100,000
  years: number; // 10
  yearlyHistory: YearReturn[][]; // Pre-computed for 0-100% stock range (each 10% step)
}

export interface RiskSliderState {
  allocation: AllocationMix;
  yearHistory: YearReturn[];
  finalBalance: number;
  maxDrawdown: number;
  bestYear: number;
  worstYear: number;
  isComplete: boolean;
}

export type RiskLevel = 'conservative' | 'balanced' | 'aggressive';

export interface RiskSliderScore {
  riskLevel: RiskLevel;
  expectedReturn: number;
  maxVolatility: number;
}
