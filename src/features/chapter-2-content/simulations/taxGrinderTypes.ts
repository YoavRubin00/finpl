/** Types for the "Tax Grinder" simulation game (Module 2-13) */

export type InvestmentTrackType = 'regular' | 'hishtalmut';

export interface InvestmentTrack {
  /** Track type */
  type: InvestmentTrackType;
  /** Display name (Hebrew) */
  name: string;
  /** Visual emoji */
  emoji: string;
  /** Monthly employee deposit (₪) */
  monthlyDeposit: number;
  /** Monthly employer bonus (₪), 0 for regular track */
  employerBonus: number;
  /** Year-by-year deposit totals (cumulative) */
  deposits: number[];
  /** Year-by-year gains (cumulative) */
  gains: number[];
  /** Year-by-year tax paid (cumulative) */
  taxPaid: number[];
  /** Net balance after tax */
  netBalance: number;
  /** Theme color for the track */
  color: string;
}

export interface TaxGrinderConfig {
  /** Simulation duration in years (slider range) */
  minYears: number;
  maxYears: number;
  /** Default years */
  defaultYears: number;
  /** Annual return rate (decimal, e.g. 0.07 = 7%) */
  annualReturn: number;
  /** Tax rate on gains for regular investment */
  regularTaxRate: number;
  /** Investment tracks */
  tracks: InvestmentTrack[];
}

export interface TaxGrinderState {
  /** Current year being displayed */
  currentYear: number;
  /** Tracks with computed balances */
  tracks: InvestmentTrack[];
  /** Net balance difference between hishtalmut and regular */
  difference: number;
  /** Tax saved by using hishtalmut */
  taxSaved: number;
  /** Whether the simulation is auto-playing */
  isPlaying: boolean;
  /** Whether the simulation has completed */
  isComplete: boolean;
}

export type TaxGrinderGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface TaxGrinderScore {
  /** Letter grade */
  grade: TaxGrinderGrade;
  /** Hebrew label for the grade */
  gradeLabel: string;
  /** Final net balance for each track */
  finalBalances: number[];
  /** Total deposited by employee for each track */
  totalDeposited: number[];
  /** Total employer contribution for hishtalmut */
  totalEmployerBonus: number;
  /** Total tax paid on regular track */
  totalTaxPaid: number;
  /** Net difference (hishtalmut advantage) */
  netDifference: number;
  /** Total tax saved by using hishtalmut */
  taxSaved: number;
}
