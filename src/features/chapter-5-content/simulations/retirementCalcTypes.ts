/**
 * SIM 28: מחשבון הפרישה (Retirement Calculator) — Module 5-28
 * Types for the retirement withdrawal strategy simulation.
 */

export type WithdrawalStrategyType = 'lump-sum' | 'monthly-annuity' | 'hybrid';

export interface WithdrawalStrategy {
  id: string;
  type: WithdrawalStrategyType;
  label: string; // Hebrew
  description: string; // Hebrew
  monthlyAmount?: number; // for annuity / hybrid annuity portion
  lumpSum?: number; // for lump-sum / hybrid lump portion
  riskLevel: 'low' | 'medium' | 'high';
  hasInheritance: boolean;
}

export interface RetirementYear {
  year: number; // 1–25
  age: number; // 67–92
  balance: number; // remaining invested balance
  withdrawal: number; // total withdrawn this year
  expenses: number; // annual living expenses (inflation-adjusted)
  taxPaid: number; // tax on gains/withdrawals this year
  netRemaining: number; // balance after withdrawals and tax
}

export interface RetirementCalcConfig {
  pensionBalance: number; // ₪2,000,000
  monthlyExpenses: number; // ₪12,000
  annuityRate: number; // monthly annuity as fraction of balance
  lumpSumReturn: number; // annual investment return on lump sum (e.g. 0.05)
  inflationRate: number; // annual inflation (e.g. 0.03)
  strategies: WithdrawalStrategy[];
}

export interface RetirementCalcState {
  selectedStrategy: WithdrawalStrategy | null;
  yearlyProjection: RetirementYear[];
  currentYear: number;
  isPlaying: boolean;
  bankruptAge: number | null; // age when lump sum runs out (null if never)
  isComplete: boolean;
}

export interface RetirementCalcScore {
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  totalReceived: number; // total money received over 25 years
  taxPaid: number; // cumulative tax paid
  depletionRisk: boolean; // did balance hit zero?
  bankruptAge: number | null; // age when money ran out
  inheritancePotential: number; // remaining balance at age 92
}
