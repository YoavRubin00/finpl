/**
 * SIM 25: מחשבון החופש (Freedom Calculator, FIRE), Module 5-25
 * Types for the FIRE (Financial Independence Retire Early) calculator simulation.
 */

/** A lifestyle tier keyed to ACTUAL monthly disposable spend (income ×
 *  (1 − savingsRate)), not the savings rate. Selecting by spend is what makes
 *  "earns ₪50k, saves 50% → lives on ₪25k → wealthy" read correctly. */
export interface LifestyleBand {
  minMonthly: number; // inclusive lower bound (₪/month)
  maxMonthly: number | null; // upper bound for display; null = top band ("מעל")
  label: string; // Hebrew
  emoji: string;
  description: string; // Hebrew, what life looks like at this spend level
  luxuryLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

/** Savings-rate row for the score-screen "השוואת שיעורי חיסכון" table —
 *  independent from LifestyleBand, which is spend-keyed. */
export interface SavingsRateOption {
  savingsRate: number; // 0.10 – 0.70
  emoji: string;
}

export interface FIREConfig {
  monthlyIncome: number; // ₪15,000 default
  annualReturn: number; // 0.07
  withdrawalRate: number; // 0.04 (the 4% rule)
}

export interface FIRECalcState {
  savingsRate: number; // 0.10 – 0.70
  yearsToFIRE: number;
  targetPortfolio: number; // 25× annual expenses
  monthlyInvestment: number;
  currentAge: number;
  fireAge: number;
  lifestylePreview: LifestyleBand | null;
  isComplete: boolean;
}

export interface FIRECalcScore {
  yearsToFIRE: number;
  fireAge: number;
  totalInvested: number; // cumulative contributions
  portfolioAtFIRE: number; // final portfolio value including growth
}
