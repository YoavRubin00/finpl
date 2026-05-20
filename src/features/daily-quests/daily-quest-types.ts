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

/** PRO track, 2× rewards + guaranteed gem */
export const QUEST_PRO_XP_MULTIPLIER = 2;
export const QUEST_PRO_COIN_MULTIPLIER = 2;
export const QUEST_PRO_GEMS_GUARANTEED = 1;

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

/** Quest templates pool — 12 entries, 4 per type. The store picks one random
 * template of each type per day, giving the user a consistent 3-quest rhythm
 * with fresh framing every morning (Brawl Stars daily quest rotation pattern). */
export const QUEST_TEMPLATES: Omit<DailyQuest, "id" | "isCompleted">[] = [
  // ── Dilemma variants ─────────────────────────────────────────────
  {
    type: "dilemma",
    titleHe: "ענו על אתגר יומי",
    descriptionHe: "שאלה פיננסית אחת קצרה בפיד הלמידה",
    lottieSource: require("../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json") as number,
  },
  {
    type: "dilemma",
    titleHe: "פתרו דילמה כספית",
    descriptionHe: "תרחיש מהחיים האמיתיים — מה הייתם עושים?",
    lottieSource: require("../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json") as number,
  },
  {
    type: "dilemma",
    titleHe: "בחרו את הצעד הנכון",
    descriptionHe: "דילמה קלה לבוקר — תחליטו ב-30 שניות",
    lottieSource: require("../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json") as number,
  },
  {
    type: "dilemma",
    titleHe: "שאלת היום מקפטן שארק",
    descriptionHe: "שאלה אחת ישירה — בלי בולשיט, בלי טריקים",
    lottieSource: require("../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json") as number,
  },

  // ── Module variants ──────────────────────────────────────────────
  {
    type: "module",
    titleHe: "סיימו מודול אחד",
    descriptionHe: "התקדמו שיעור אחד במסלול הפרקים",
    lottieSource: require("../../../assets/lottie/wired-flat-112-book-hover-closed.json") as number,
  },
  {
    type: "module",
    titleHe: "למדו פרק חדש",
    descriptionHe: "השלימו מודול שלם — 3-7 דקות",
    lottieSource: require("../../../assets/lottie/wired-flat-112-book-hover-closed.json") as number,
  },
  {
    type: "module",
    titleHe: "שיעור הבונוס היומי",
    descriptionHe: "מודול אחד מהפרק שאתם בעיצומו",
    lottieSource: require("../../../assets/lottie/wired-flat-112-book-hover-closed.json") as number,
  },
  {
    type: "module",
    titleHe: "פיתחו את הידע הפיננסי",
    descriptionHe: "מודול ללמידה — דקות שיתנו לכם יתרון",
    lottieSource: require("../../../assets/lottie/wired-flat-112-book-hover-closed.json") as number,
  },

  // ── Swipe variants ───────────────────────────────────────────────
  {
    type: "swipe",
    titleHe: "שחקו במשחק סוויפ",
    descriptionHe: "מחקו מיתוסים פיננסיים בסוויפ ימינה/שמאלה",
    lottieSource: require("../../../assets/lottie/wired-flat-56-document-hover-swipe.json") as number,
  },
  {
    type: "swipe",
    titleHe: "מחקו 5 בולשיט פיננסי",
    descriptionHe: "סוויפ שמאלה לכל פייק — צודקים מקבלים XP",
    lottieSource: require("../../../assets/lottie/wired-flat-56-document-hover-swipe.json") as number,
  },
  {
    type: "swipe",
    titleHe: "הבחנה בין אמת לשקר",
    descriptionHe: "תוכן פיננסי שעובר היום ברשתות — מי צודק?",
    lottieSource: require("../../../assets/lottie/wired-flat-56-document-hover-swipe.json") as number,
  },
  {
    type: "swipe",
    titleHe: "סוויפ חמסה",
    descriptionHe: "5 כרטיסים מהר — מי המהיר ומדויק יותר?",
    lottieSource: require("../../../assets/lottie/wired-flat-56-document-hover-swipe.json") as number,
  },
];

/** Returns the templates grouped by type — used by the store for daily rotation. */
export function questTemplatesByType(): Record<DailyQuest["type"], typeof QUEST_TEMPLATES> {
  return {
    dilemma: QUEST_TEMPLATES.filter((t) => t.type === "dilemma"),
    module: QUEST_TEMPLATES.filter((t) => t.type === "module"),
    swipe: QUEST_TEMPLATES.filter((t) => t.type === "swipe"),
  };
}
