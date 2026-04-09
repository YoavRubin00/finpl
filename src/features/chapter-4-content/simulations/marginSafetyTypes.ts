/**
 * SIM: מחשבון מרווח ביטחון (Margin of Safety Calculator)
 * Types for Graham-style value investing analysis.
 */

export interface StockInput {
  id: string;
  name: string;
  emoji: string;
  price: number;
  eps: number;
  bookValue: number;
  dividendYield: number;
  debtToEquity: number;
  yearsProfitable: number;
  growthRate: number;
  aaaYield: number;
}

export type SafetyGrade = 'green' | 'yellow' | 'red';

export interface GrahamValuation {
  pe: number;
  pb: number;
  grahamNumber: number;
  intrinsicValue: number;
  marginOfSafety: number;
  grade: SafetyGrade;
  criteriaResults: CriterionResult[];
}

export interface CriterionResult {
  label: string;
  value: string;
  passed: boolean;
  threshold: string;
}
