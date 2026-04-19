/**
 * SIM 26: משחקי הנדל"ן (Real Estate Game), Module 5-26
 * Types for the mortgage & real estate simulation.
 */

export interface MortgageMix {
  fixedPercent: number; // 0–1
  variablePercent: number; // 0–1 (fixedPercent + variablePercent = 1)
  fixedRate: number; // annual, e.g. 0.045
  variableRate: number; // annual, e.g. 0.035
  years: number; // loan term
}

export interface MortgageOption {
  id: string;
  label: string; // Hebrew
  description: string; // Hebrew
  fixedPercent: number;
  variablePercent: number;
  years: number;
  monthlyPayment: number; // pre-calculated for display
}

export type RealEstateEventEffect =
  | 'rate-hike'
  | 'expense'
  | 'income-change'
  | 'property-value';

export interface RealEstateEvent {
  id: string;
  year: number;
  description: string; // Hebrew
  emoji: string;
  effect: RealEstateEventEffect;
  impact: number; // e.g. +0.015 for rate hike, 80000 for expense, 0.20 for +20% property
}

export interface RealEstateConfig {
  propertyPrice: number; // ₪1,500,000
  downPayment: number; // ₪300,000
  mortgageOptions: MortgageOption[];
  events: RealEstateEvent[];
  rentalIncome?: number; // optional monthly rental income
}

export interface RealEstateState {
  selectedMortgage: MortgageOption | null;
  currentYear: number;
  monthlyPayment: number;
  totalPaid: number;
  remainingLoan: number;
  propertyValue: number;
  eventsHistory: RealEstateEvent[];
  isComplete: boolean;
}

export interface RealEstateScore {
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  totalPaid: number;
  totalInterest: number;
  propertyFinalValue: number;
  netGainOrLoss: number; // propertyFinalValue - totalPaid - downPayment
}
