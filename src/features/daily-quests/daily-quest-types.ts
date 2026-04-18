export interface DailyQuest {
  id: string;
  type: "dilemma" | "module" | "swipe";
  titleHe: string;
  /** One-line explanation that tells the user what to actually do. */
  descriptionHe: string;
  lottieSource: number;
  isCompleted: boolean;
}

export const QUEST_XP_REWARD = 100;
export const QUEST_COIN_REWARD = 300;

/** Additional variable reward on top of base XP/Coins.
 * Chance tuned below regular-chest rate (25%) to protect gem scarcity / monetization. */
export const QUEST_GEM_CHANCE = 0.15;
export const QUEST_GEM_AMOUNT = 1;

/** +10% bonus to coins & XP for every 7 streak days */
export const QUEST_STREAK_BONUS_STEP = 7;
export const QUEST_STREAK_BONUS_PCT = 0.10;

/** Every 7th streak day also grants a streak freeze as a quest bonus */
export const QUEST_FREEZE_BONUS_MODULO = 7;

export interface QuestRewardSummary {
  xp: number;
  coins: number;
  gems: number;
  freezes: number;
  streakBonusPct: number;
}

export const QUEST_TEMPLATES: Omit<DailyQuest, "id" | "isCompleted">[] = [
  {
    type: "dilemma",
    titleHe: "ענו על אתגר יומי",
    descriptionHe: "שאלה פיננסית אחת קצרה בפיד הלמידה",
    lottieSource: require("../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json") as number,
  },
  {
    type: "module",
    titleHe: "סיימו מודול אחד",
    descriptionHe: "התקדמו שיעור אחד במסלול הפרקים",
    lottieSource: require("../../../assets/lottie/wired-flat-112-book-hover-closed.json") as number,
  },
  {
    type: "swipe",
    titleHe: "שחקו במשחק סוויפ",
    descriptionHe: "מחקו מיתוסים פיננסיים בסוויפ ימינה/שמאלה",
    lottieSource: require("../../../assets/lottie/wired-flat-56-document-hover-swipe.json") as number,
  },
];
