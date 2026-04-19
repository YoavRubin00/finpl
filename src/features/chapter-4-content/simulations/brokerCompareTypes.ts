/**
 * SIM 4-26: השוואת ברוקרים (Broker Compare), Module 4-26
 * Types for the broker fee comparison simulation.
 */

export interface Broker {
  id: string;
  name: string;
  emoji: string;
  tradeFeePercent: number;
  tradeFeeMin: number;
  custodyFeePercent: number;
  fxFeePercent: number;
  inactivityFee: number;
}

export interface UserProfile {
  investmentAmount: number;
  tradesPerMonth: number;
  isInternational: boolean;
}

export interface BrokerCompareConfig {
  brokers: Broker[];
}

export interface BrokerCompareState {
  profile: UserProfile;
  yearlyCosts: Record<string, number>;
  selectedBroker: string | null;
  isComplete: boolean;
}

export interface BrokerCompareScore {
  cheapestBroker: string;
  yearlyDifference: number;
  totalSavings10Y: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  gradeLabel: string;
}
