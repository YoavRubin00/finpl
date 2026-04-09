/** Types for the "Build Your Credit Score" simulation game (Module 2-10) */

export type CreditEventSeverity = 'routine' | 'important' | 'critical';

export interface CreditOption {
  id: string;
  /** Hebrew label for the option */
  label: string;
  /** Impact on credit score (positive = good, negative = bad) */
  scoreImpact: number;
  /** Hebrew feedback shown after choosing */
  feedback: string;
  /** Whether this is the correct/best choice */
  isCorrect: boolean;
  /** Hebrew explanation of why this affects credit */
  explanation: string;
}

export type NotificationSource = 'bank' | 'whatsapp' | 'credit_card' | 'bdi';

export interface CreditEvent {
  id: string;
  /** Name of the sender (e.g. 'Bank Hapoalim', 'Yoni') */
  senderName: string;
  /** Type of notification to control styling/icon */
  sourceType: NotificationSource;
  /** The text of the push notification */
  description: string;
  /** Available choices for this event */
  options: CreditOption[];
  /** Event severity level */
  severity: CreditEventSeverity;
}

export interface CreditScoreConfig {
  /** Starting credit score */
  startingScore: number;
  /** Array of credit events */
  events: CreditEvent[];
  /** Total number of rounds */
  totalRounds: number;
}

export interface ChoiceRecord {
  /** The event that was presented */
  eventId: string;
  /** The option that was chosen */
  optionId: string;
  /** The score impact applied */
  impact: number;
  /** Score after this choice */
  scoreAfter: number;
}

export interface CreditScoreState {
  /** Current credit score (300-1000) */
  currentScore: number;
  /** Current round (0-based) */
  round: number;
  /** Number of correct choices made */
  correctChoices: number;
  /** History of previous choices and their impacts */
  history: ChoiceRecord[];
  /** Whether the game is complete */
  isComplete: boolean;
}

export type CreditScoreGrade = 'S' | 'A' | 'B' | 'C' | 'F';
export type CreditScoreTrend = 'improved' | 'stable' | 'declined';

export interface CreditScoreScore {
  /** Final credit score */
  finalScore: number;
  /** Letter grade */
  grade: CreditScoreGrade;
  /** Hebrew label for the grade */
  gradeLabel: string;
  /** Score trend from start to end */
  trend: CreditScoreTrend;
  /** Highest score reached during the game */
  peakScore: number;
  /** Lowest score reached during the game */
  lowestScore: number;
}
