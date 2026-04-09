/** Types for the "Retirement Race" simulation game (Module 2-12) */

export interface Runner {
  /** Runner name (Hebrew) */
  name: string;
  /** Visual emoji */
  emoji: string;
  /** Age when starting to save */
  startAge: number;
  /** Monthly employee deposit (₪) */
  monthlyDeposit: number;
  /** Monthly employer match (₪) */
  employerMatch: number;
  /** Current accumulated balance (₪) */
  currentBalance: number;
  /** Theme color for the runner */
  color: string;
  /** Year-by-year cumulative balance data */
  yearData: number[];
}

export interface RetirementRaceConfig {
  /** Retirement age */
  retirementAge: number;
  /** Annual return rate (decimal, e.g. 0.06 = 6%) */
  annualReturn: number;
  /** The two runners competing */
  runners: Runner[];
}

export interface RetirementRaceState {
  /** Current year being displayed (age of the older starter) */
  currentYear: number;
  /** Runners with updated balances */
  runners: Runner[];
  /** Whether the race is auto-playing */
  isPlaying: boolean;
  /** Playback speed in ms per tick */
  playSpeed: number;
  /** Whether the race has completed */
  isComplete: boolean;
  /** The year (age of younger starter) when they overtake the other */
  overtakeYear: number | null;
}

export type RetirementRaceGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface RetirementRaceScore {
  /** Final balances for each runner */
  finalBalances: number[];
  /** Total deposited by each runner (employee only) */
  totalDeposited: number[];
  /** Total deposited including employer match */
  totalWithEmployer: number[];
  /** The multiplier difference (e.g. "פי 1.8") */
  multiplier: number;
  /** The year the early starter overtook the late starter */
  overtakeYear: number | null;
}
