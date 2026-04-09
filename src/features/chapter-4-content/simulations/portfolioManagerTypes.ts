/**
 * SIM 24: מנהל התיקים (Portfolio Manager) — Module 4-24
 * Types for the portfolio allocation + world events simulation.
 */

export interface AssetClass {
  id: string;
  name: string; // Hebrew
  emoji: string;
  color: string;
}

export interface WorldEvent {
  id: string;
  name: string; // Hebrew
  emoji: string;
  impacts: Record<string, number>; // assetId → % change (e.g., -0.20 for -20%)
}

export interface PortfolioManagerConfig {
  assetClasses: AssetClass[];
  events: WorldEvent[];
  budget: number; // ₪200,000
}

export interface PortfolioManagerState {
  allocations: Record<string, number>; // assetId → percentage (0-100, must sum to 100)
  portfolioValue: number;
  eventHistory: { eventId: string; valueBefore: number; valueAfter: number }[];
  currentEventIndex: number; // -1 = building phase, 0-4 = event phase
  isComplete: boolean;
}

export type PortfolioManagerGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface PortfolioManagerScore {
  grade: PortfolioManagerGrade;
  finalValue: number;
  maxDrawdown: number; // worst single-event drop as decimal (e.g., -0.15 for -15%)
  volatility: number; // std dev of event-to-event value changes
  diversificationBonus: boolean; // true if no single asset > 40%
}
