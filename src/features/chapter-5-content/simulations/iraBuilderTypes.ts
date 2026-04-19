/**
 * SIM 5-31: בונה ה-IRA (IRA Builder), Module 5-31
 * Types for the Traditional vs Roth IRA comparison simulation.
 */

export type IRAType = 'traditional' | 'roth';

export interface IRAConfig {
  annualLimit: number;       // 7000
  catchUpLimit: number;      // 8000
  defaultReturn: number;     // 0.08 (8%)
  defaultTaxNow: number;     // 0.22 (22%)
  defaultTaxRetirement: number; // 0.30 (30%)
  years: number;             // 30
}

export interface IRAState {
  selectedType: IRAType | null;
  annualContribution: number;
  investmentReturn: number;     // decimal fraction (0.08 = 8%)
  taxRateNow: number;           // decimal fraction (0.22 = 22%)
  taxRateRetirement: number;    // decimal fraction (0.30 = 30%)
  traditionalByYear: number[];  // gross balance after each year
  rothByYear: number[];         // gross balance after each year
  isComplete: boolean;
}

export interface IRAScore {
  traditionalGross: number;     // pre-tax final balance
  traditionalNet: number;       // after-tax final balance (taxed at retirement rate)
  rothGross: number;            // final balance (same as net since contributions were post-tax)
  rothNet: number;              // after-tax final balance (no tax on withdrawal)
  winner: IRAType;              // which type yields higher net
  differenceNet: number;        // absolute difference in net values
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  gradeLabel: string;
}
