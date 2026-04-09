/**
 * SIM: מחיר vs. ערך — Price vs Value Chart
 * Types for the value-investing simulation.
 */

export interface TimePoint {
  year: number;
  month: number;
  price: number;        // Market price (volatile)
  intrinsicValue: number; // Smooth upward line
}

export interface TradeAction {
  type: 'buy' | 'sell';
  yearIndex: number;
  price: number;
}

export type PVGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface PVResult {
  totalReturn: number;       // % profit/loss
  grahamReturn: number;      // What Graham would have earned
  grade: PVGrade;
  score: number;             // 0-100
  feedback: string;          // Hebrew
  tradeCount: number;
  goodBuys: number;          // Bought when margin > 20%
  badBuys: number;           // Bought when price > value
}
