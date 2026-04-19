/**
 * SIM 27: בעל הבית הווירטואלי (Virtual Landlord, REITs), Module 5-27
 * Types for the REIT portfolio simulation.
 */

export interface REITSector {
  id: string;
  name: string; // Hebrew + English
  emoji: string;
  annualReturn: number; // e.g. 0.08
  dividendYield: number; // e.g. 0.05
  volatility: number; // 0–1 scale (low=0.2, moderate=0.5, high=0.8)
  description: string; // Hebrew
}

export interface REITEvent {
  id: string;
  description: string; // Hebrew
  emoji: string;
  impacts: Record<string, number>; // sectorId → multiplier (e.g. -0.15 for -15%, +0.12 for +12%)
}

export interface REITConfig {
  budget: number; // ₪100,000
  sectors: REITSector[];
  events: REITEvent[];
  years: number; // 10
}

export interface REITState {
  allocations: Record<string, number>; // sectorId → amount in ₪
  totalValue: number;
  totalDividends: number;
  currentYear: number;
  eventHistory: REITEvent[];
  isComplete: boolean;
}

export interface REITScore {
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  totalValue: number; // final portfolio value
  totalDividends: number; // cumulative dividends received
  totalReturn: number; // (totalValue + totalDividends - budget) / budget
  averageMonthlyIncome: number; // totalDividends / (years × 12)
}
