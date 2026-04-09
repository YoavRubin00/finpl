/** Types for the "Investment Obstacle Course" simulation game (Module 3-17) */

export type PathEventType = 'dip' | 'temptation' | 'growth' | 'milestone';

export interface PathOption {
  /** Unique identifier */
  id: string;
  /** Hebrew button label */
  label: string;
  /** What happens when chosen */
  effect: 'withdraw' | 'continue' | 'add-more';
  /** Tax penalty as decimal (e.g. 0.25 = 25%) on gains portion */
  taxImplication: number;
  /** Hebrew feedback message shown after choosing */
  feedback: string;
}

export interface PathEvent {
  /** Unique identifier */
  id: string;
  /** Year when event occurs */
  year: number;
  /** Hebrew description of the event */
  description: string;
  /** Visual emoji */
  emoji: string;
  /** Type of event */
  type: PathEventType;
  /** Available choices for the player */
  options: PathOption[];
}

export interface InvestmentPathConfig {
  /** Initial deposit into kupat gemel (₪) */
  initialDeposit: number;
  /** Monthly recurring deposit (₪) */
  monthlyDeposit: number;
  /** Annual return rate (e.g. 0.07 = 7%) */
  annualReturn: number;
  /** Array of path events the player encounters */
  events: PathEvent[];
}

export interface InvestmentPathState {
  /** Current balance in the kupat gemel (₪) */
  balance: number;
  /** Total amount deposited over time (₪) */
  totalDeposited: number;
  /** Total gains earned (₪) */
  totalGains: number;
  /** Current year in the simulation */
  year: number;
  /** Index of the current event being shown */
  currentEventIndex: number;
  /** Whether the player has withdrawn */
  hasWithdrawn: boolean;
  /** Amount withdrawn (₪), 0 if still invested */
  withdrawnAmount: number;
  /** Tax paid on withdrawal (₪) */
  taxPaid: number;
  /** Whether the simulation is complete */
  isComplete: boolean;
  /** Whether auto-advance is playing */
  isPlaying: boolean;
  /** The option the player chose for the current event (null if not yet chosen) */
  selectedOptionId: string | null;
  /** Balance if the player had not withdrawn (for ghost path comparison) */
  ghostBalance: number;
}

export type InvestmentPathGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface InvestmentPathScore {
  /** Letter grade */
  grade: InvestmentPathGrade;
  /** Hebrew label for the grade */
  gradeLabel: string;
  /** Final balance (₪) — actual received amount */
  finalBalance: number;
  /** Total deposited over the journey (₪) */
  totalDeposited: number;
  /** Total gains (₪) */
  totalGains: number;
  /** Tax paid (₪) */
  taxPaid: number;
  /** What balance would have been if player held to year 15 (₪) */
  potentialBalance: number;
  /** Year at which player withdrew (0 if never) */
  withdrawnAtYear: number;
}
