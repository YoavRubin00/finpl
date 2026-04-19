/** Types for the "Set & Forget, Robo-Advisor" simulation game (Module 3-18) */

export interface RiskOption {
  /** Unique identifier */
  id: string;
  /** Hebrew label for this option */
  label: string;
  /** Risk score (1 = conservative, 5 = aggressive) */
  riskScore: number;
}

export interface RiskQuestion {
  /** Unique identifier */
  id: string;
  /** Hebrew question text */
  question: string;
  /** Visual emoji for the question */
  emoji: string;
  /** Available answer options */
  options: RiskOption[];
}

export interface PortfolioAllocation {
  /** Percentage allocated to stocks (0-100) */
  stocks: number;
  /** Percentage allocated to bonds (0-100) */
  bonds: number;
  /** Percentage allocated to cash (0-100) */
  cash: number;
}

export interface MarketYear {
  /** Year number (1-10) */
  year: number;
  /** Stock market return as decimal (e.g. 0.15 = +15%, -0.30 = -30%) */
  stockReturn: number;
  /** Bond market return as decimal (e.g. 0.04 = +4%) */
  bondReturn: number;
  /** Hebrew headline describing the market that year */
  headline: string;
}

export interface RoboAdvisorConfig {
  /** Risk assessment questions */
  questions: RiskQuestion[];
  /** 10-year market history for simulation */
  marketHistory: MarketYear[];
  /** Drift threshold triggering rebalance (e.g. 0.05 = 5%) */
  rebalanceThreshold: number;
  /** Initial investment amount (₪) */
  initialInvestment: number;
}

/** Simulation phase */
export type RoboAdvisorPhase = 'quiz' | 'building' | 'simulating' | 'results';

export interface RoboAdvisorState {
  /** Current phase of the simulation */
  phase: RoboAdvisorPhase;
  /** Computed risk profile (1-5), null until quiz complete */
  riskProfile: number | null;
  /** Target portfolio allocation based on risk profile */
  allocation: PortfolioAllocation | null;
  /** Current robo-advisor portfolio balance (₪) */
  roboBalance: number;
  /** Current manual investor portfolio balance (₪) */
  manualBalance: number;
  /** Current year in the simulation (1-10) */
  currentYear: number;
  /** Whether auto-play is running */
  isPlaying: boolean;
  /** Whether the simulation is complete */
  isComplete: boolean;
  /** Player's answers to quiz questions (questionId → riskScore) */
  quizAnswers: Record<string, number>;
  /** Number of rebalances performed by the robo-advisor */
  rebalanceCount: number;
  /** Year-by-year robo balance history for chart */
  roboHistory: number[];
  /** Year-by-year manual balance history for chart */
  manualHistory: number[];
}

export type RoboAdvisorGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface RoboAdvisorScore {
  /** Letter grade */
  grade: RoboAdvisorGrade;
  /** Hebrew label for the grade */
  gradeLabel: string;
  /** Final robo-advisor balance (₪) */
  roboFinalBalance: number;
  /** Final manual investor balance (₪) */
  manualFinalBalance: number;
  /** Robo advantage as percentage */
  roboAdvantagePercent: number;
  /** Robo advantage in ₪ */
  roboAdvantageShekel: number;
  /** Total number of automatic rebalances */
  rebalanceCount: number;
  /** Risk profile name in Hebrew */
  riskProfileLabel: string;
}
