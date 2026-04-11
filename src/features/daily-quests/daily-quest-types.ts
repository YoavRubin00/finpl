export interface DailyQuest {
  id: string;
  type: "dilemma" | "module" | "swipe";
  titleHe: string;
  lottieSource: number;
  isCompleted: boolean;
}

export const QUEST_XP_REWARD = 100;
export const QUEST_COIN_REWARD = 300;

export const QUEST_TEMPLATES: Omit<DailyQuest, "id" | "isCompleted">[] = [
  {
    type: "dilemma",
    titleHe: "ענה על אתגר יומי",
    lottieSource: require("../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json") as number,
  },
  {
    type: "module",
    titleHe: "סיים מודול אחד",
    lottieSource: require("../../../assets/lottie/wired-flat-112-book-hover-closed.json") as number,
  },
  {
    type: "swipe",
    titleHe: "שחק במשחק סוויפ",
    lottieSource: require("../../../assets/lottie/wired-flat-146-trolley-hover-jump.json") as number,
  },
];
