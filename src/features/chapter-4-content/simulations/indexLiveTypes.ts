/**
 * SIM 20: מדד לייב (Index Live, ‎S&P‎ 500 Time Machine), Module 4-20
 * Types for the ‎S&P‎ 500 historical investment time machine simulation.
 */

export interface SP500Year {
  year: number;
  price: number;
  annualReturn: number;
  cumulativeReturn: number;
}

export interface IndexLiveConfig {
  initialInvestment: number; // ₪10,000
  yearData: SP500Year[];
  startYearRange: [number, number]; // [1980, 2025]
}

export interface IndexLiveState {
  selectedStartYear: number;
  currentEndYear: number; // 2025
  investedValue: number;
  currentValue: number;
  totalReturn: number;
  bestStartYear: number;
  worstStartYear: number;
  isComplete: boolean;
}

export interface IndexLiveScore {
  selectedReturn: number;
  bestReturn: number;
  worstReturn: number;
  yearsInvested: number;
  averageAnnualReturn: number;
}
