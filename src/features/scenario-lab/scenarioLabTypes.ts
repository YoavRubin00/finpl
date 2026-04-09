/** Sector a user can allocate money into */
export interface Sector {
  id: string;
  name: string;
  emoji: string;
  color: string;
  /** Short Hebrew educational description */
  description: string;
  /** Final multiplier after the scenario plays out (e.g. 0.6 = -40%, 1.3 = +30%) */
  scenarioMultiplier: number;
}

/** A news headline that fires during the simulation */
export interface SimEvent {
  /** Month 1-12 */
  month: number;
  /** Hebrew headline text */
  headline: string;
  /** Cumulative portfolio multiplier at this point (for the "market" benchmark) */
  marketImpact: number;
}

/** Full scenario definition */
export interface Scenario {
  id: string;
  title: string;
  emoji: string;
  color: string;
  difficulty: 1 | 2 | 3;
  year: number;
  briefing: string;
  sectors: Sector[];
  events: SimEvent[];
  /** Market benchmark final multiplier (e.g. 0.7 = market dropped 30%) */
  marketBenchmark: number;
  lessonTitle: string;
  lessonText: string;
  /** "מה באמת קרה" — real historical outcome summary */
  historicalNote: string;
}

export type ScenarioGrade = 'S' | 'A' | 'B' | 'C' | 'F';

export interface SimState {
  phase: 'briefing' | 'allocation' | 'simulating' | 'results';
  allocation: Record<string, number>;
  currentMonth: number;
  portfolioValue: number;
  portfolioHistory: number[];
  activeHeadline: string | null;
  finalGrade: ScenarioGrade | null;
  finalValue: number;
}

export interface ScenarioCompletion {
  grade: ScenarioGrade;
  bestScore: number;
  completedAt: number;
}

export interface UserSuggestion {
  id: string;
  title: string;
  description: string;
  submittedAt: number;
}

export interface ScenarioLabState {
  completedScenarios: Record<string, ScenarioCompletion>;
  lastPlayedDate: string | null;
  totalScenariosPlayed: number;
  userSuggestions: UserSuggestion[];

  canPlayToday: () => boolean;
  recordCompletion: (scenarioId: string, grade: ScenarioGrade, score: number) => void;
  getBestGrade: (scenarioId: string) => ScenarioGrade | null;
  submitSuggestion: (title: string, description: string) => void;
}
