/**
 * SIM 4-27: מנהל המשבר (Crisis Manager) — Module 4-27
 * Types for the historical crisis portfolio management simulation.
 */

export interface CrisisEvent {
  id: string;
  title: string;
  emoji: string;
  year: number;
  headline: string;
  marketDropPercent: number;
  recoveryMonths: number;
  postRecoveryGainPercent: number;
}

export type PlayerAction = 'sell' | 'hold' | 'buy';

export interface CrisisRound {
  event: CrisisEvent;
  action: PlayerAction | null;
  playerBalanceAfter: number;
  holdBalanceAfter: number;
}

export interface CrisisConfig {
  initialBalance: number; // 100000
  events: CrisisEvent[];
}

export interface CrisisState {
  currentEventIndex: number;
  playerBalance: number;
  holdBalance: number;
  rounds: CrisisRound[];
  showingResult: boolean;
  isComplete: boolean;
}

export interface CrisisScore {
  finalBalance: number;
  holdStrategyBalance: number;
  difference: number;
  beatHoldStrategy: boolean;
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  gradeLabel: string;
}
