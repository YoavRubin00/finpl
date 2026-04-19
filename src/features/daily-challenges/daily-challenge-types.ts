export interface DilemmaChoice {
  text: string;
  isCorrect: boolean;
  feedback: string;
}

export interface DilemmaScenario {
  id: string;
  scenarioText: string; // Contains {userName} placeholder
  choices: DilemmaChoice[];
  xpReward: number;
  coinReward: number;
  category: string;
  emoji: string;
}

export interface InvestmentOption {
  label: string;
  emoji: string;
  returnMultiplier: number; // e.g. 1.15 = +15%
  feedback: string;
}

export interface InvestmentScenario {
  id: string;
  macroHeadline: string;
  macroDescription: string;
  emoji: string;
  options: [InvestmentOption, InvestmentOption, InvestmentOption];
  xpReward: number;
  coinReward: number;
  virtualBudget: number; // 10000
}

/** Max plays per day for free users. Pro users get unlimited. */
export const MAX_DAILY_PLAYS = 3;

/** Dilemma is always 1 per day, even for pro users. */
export const MAX_DILEMMA_DAILY = 1;

/** Uniform rewards for all challenges. */
export const CHALLENGE_XP_REWARD = 30;
export const CHALLENGE_COIN_REWARD = 100;

/** Play counts per date: { "2026-03-21": 2 } */
export type PlayCountMap = Record<string, number>;

export interface DailyChallengesState {
  dilemmaPlays: PlayCountMap;
  investmentPlays: PlayCountMap;
  crashGamePlays: PlayCountMap;
  swipeGamePlays: PlayCountMap;
  bullshitSwipePlays: PlayCountMap;
  higherLowerPlays: PlayCountMap;
  budgetNinjaPlays: PlayCountMap;
  priceSliderPlays: PlayCountMap;
  cashoutRushPlays: PlayCountMap;
  fomoKillerPlays: PlayCountMap;
  dilemmaCorrectCount: number;
  investmentTotalAnswered: number;

  /** Returns how many plays used today. */
  getDilemmaPlaysToday: () => number;
  getInvestmentPlaysToday: () => number;
  getCrashGamePlaysToday: () => number;
  getSwipeGamePlaysToday: () => number;
  getBullshitSwipePlaysToday: () => number;
  getHigherLowerPlaysToday: () => number;
  getBudgetNinjaPlaysToday: () => number;
  getPriceSliderPlaysToday: () => number;
  getCashoutRushPlaysToday: () => number;
  getFomoKillerPlaysToday: () => number;

  /** Returns true if max plays reached (respects pro status). */
  hasDilemmaAnsweredToday: () => boolean;
  hasInvestmentAnsweredToday: () => boolean;
  hasCrashGamePlayedToday: () => boolean;
  hasSwipeGamePlayedToday: () => boolean;
  hasBullshitSwipePlayedToday: () => boolean;
  hasHigherLowerPlayedToday: () => boolean;
  hasBudgetNinjaPlayedToday: () => boolean;
  hasPriceSliderPlayedToday: () => boolean;
  hasCashoutRushPlayedToday: () => boolean;
  hasFomoKillerPlayedToday: () => boolean;

  answerDilemma: (date: string, wasCorrect: boolean) => void;
  answerInvestment: (date: string) => void;
  playCrashGame: (date: string, coinsEarned: number) => void;
  playSwipeGame: (date: string, score: number) => void;
  playBullshitSwipe: (date: string, score: number) => void;
  playHigherLower: (date: string, wasCorrect: boolean) => void;
  playBudgetNinja: (date: string, score: number) => void;
  playPriceSlider: (date: string, accuracyPercent: number) => void;
  playCashoutRush: (date: string, cashedOut: boolean) => void;
  playFomoKiller: (date: string, perfect: boolean) => void;
}
