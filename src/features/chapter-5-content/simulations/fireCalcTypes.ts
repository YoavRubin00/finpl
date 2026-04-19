/**
 * SIM 25: מחשבון החופש (Freedom Calculator, FIRE), Module 5-25
 * Types for the FIRE (Financial Independence Retire Early) calculator simulation.
 */

export interface LifestylePreset {
  savingsRate: number; // 0.10 – 0.70
  label: string; // Hebrew
  emoji: string;
  description: string; // Hebrew, what life looks like at this rate
  yearlyExpenses: number; // derived from income × (1 - savingsRate) × 12
  luxuryLevel: 1 | 2 | 3 | 4 | 5;
}

export interface FIREConfig {
  monthlyIncome: number; // ₪15,000 default
  annualReturn: number; // 0.07
  withdrawalRate: number; // 0.04 (the 4% rule)
  lifestylePresets: LifestylePreset[];
}

export interface FIRECalcState {
  savingsRate: number; // 0.10 – 0.70
  yearsToFIRE: number;
  targetPortfolio: number; // 25× annual expenses
  monthlyInvestment: number;
  currentAge: number;
  fireAge: number;
  lifestylePreview: LifestylePreset | null;
  isComplete: boolean;
}

export interface FIRECalcScore {
  yearsToFIRE: number;
  fireAge: number;
  totalInvested: number; // cumulative contributions
  portfolioAtFIRE: number; // final portfolio value including growth
}
