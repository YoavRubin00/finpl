/** Types for the "Panic Index" simulation game (Module 3-16) */

export type MarketSentiment = 'fear' | 'greed' | 'neutral';

export interface MarketEvent {
  /** Unique identifier */
  id: string;
  /** Year of the event */
  year: number;
  /** Hebrew headline text */
  headline: string;
  /** Market change as decimal (e.g. -0.25 = -25%) */
  marketChange: number;
  /** Emotional sentiment of the event */
  sentiment: MarketSentiment;
  /** Brief Hebrew context about the historical basis */
  historicalContext: string;
}

export interface PanicIndexConfig {
  /** Starting investment amount (₪) */
  initialInvestment: number;
  /** Array of sequential market events */
  events: MarketEvent[];
  /** Bonus multiplier for holding through everything */
  recoveryBonus: number;
}

export interface PanicIndexState {
  /** Index of the current event being displayed */
  currentEventIndex: number;
  /** Current portfolio value (₪) */
  portfolioValue: number;
  /** Whether the player has sold their portfolio */
  hasSold: boolean;
  /** Value at which the player sold (₪), null if still holding */
  soldAtValue: number | null;
  /** Number of consecutive events the player has held through */
  holdStreak: number;
  /** Number of times the player tapped/hovered the sell button without confirming */
  panicMoments: number;
  /** Whether the simulation is complete */
  isComplete: boolean;
  /** Whether auto-advance is currently playing */
  isPlaying: boolean;
}

export type PanicIndexGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface PanicIndexScore {
  /** Letter grade */
  grade: PanicIndexGrade;
  /** Hebrew label for the grade */
  gradeLabel: string;
  /** Final portfolio value (₪) */
  finalValue: number;
  /** Number of events the player held through */
  holdDuration: number;
  /** Panic resistance score (0-100), higher is better */
  panicResistance: number;
  /** Value player would have had if they held through everything (₪) */
  potentialValue: number;
}
