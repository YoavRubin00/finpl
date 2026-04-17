/** Chapter CTA button colors */
export const CHAPTER_CTA_COLORS: Record<string, { bg: string; shadow: string; text: string }> = {
  "chapter-1": { bg: "#22d3ee", shadow: "#0891b2", text: "#1f2937" },
  "chapter-2": { bg: "#38bdf8", shadow: "#0369a1", text: "#ffffff" },
  "chapter-3": { bg: "#60a5fa", shadow: "#1d4ed8", text: "#ffffff" },
  "chapter-4": { bg: "#818cf8", shadow: "#4338ca", text: "#ffffff" },
  "chapter-5": { bg: "#22d3ee", shadow: "#0e7490", text: "#1f2937" },
};

export type LessonCategory =
  | "Budgeting"
  | "Saving"
  | "Debt"
  | "Investing"
  | "Taxes"
  | "Insurance";

export type LessonContentType = "text" | "video";

export interface FeedVideo {
  id: string;
  type: "video";
  title: string;
  description: string;
  category: LessonCategory;
  videoId: string; // Placeholder for future media, e.g. "placeholder-1"
  localVideo?: ReturnType<typeof require>; // Local MP4 asset via require()
  durationMinutes: number;
  pyramidLayer: 1 | 2 | 3 | 4 | 5;
  likes: number;
  saves: number;
  /** Optional module link — when set, a CTA navigates to this module */
  moduleId?: string;
  moduleIndex?: number;
  chapterId?: string;
  storeChapterId?: string;
}

export interface FeedQuote {
  id: string;
  type: "quote";
  title: string;
  quote: string;
  author?: string;
  category: LessonCategory;
  pyramidLayer: 1 | 2 | 3 | 4 | 5;
  likes: number;
  saves: number;
  /** Optional module link — when set, a CTA navigates to this module */
  moduleId?: string;
  moduleIndex?: number;
  chapterId?: string;
  storeChapterId?: string;
}

export interface FeedLesson {
  id: string;
  category: LessonCategory;
  title: string;
  description: string;
  xpReward: number;
  durationMinutes: number;
  pyramidLayer: 1 | 2 | 3 | 4 | 5;
  /** Difficulty rating shown as filled/empty stars (1-5). */
  difficulty: 1 | 2 | 3 | 4 | 5;
  contentType: LessonContentType;
  /** Required when contentType is "video" — require() asset or URI */
  videoSource?: number;
}

export interface FeedComic {
  id: string;
  type: "comic";
  title: string;
  moduleId: string;
  moduleIndex: number;
  chapterId: string;
  storeChapterId: string;
  chapterName: string;
  imageUrl: ReturnType<typeof require>;
  likes: number;
  saves: number;
}

export interface FeedModuleHook {
  id: string;
  type: "module-hook";
  moduleId: string;
  moduleIndex: number;
  chapterId: string;
  storeChapterId: string;
  moduleTitle: string;
  chapterName: string;
  hook: string;
  videoHookAsset?: { uri: string };
  pyramidLayer: number;
}

export interface FeedMacroEvent {
  id: string;
  type: "macro-event";
  event: import("../macro-events/types").MacroEvent;
}

export interface FeedScenario {
  id: string;
  type: "scenario";
  scenario: import("../scenario-lab/scenarioLabTypes").Scenario;
  locked?: boolean;
}

export interface FeedDailyQuiz {
  id: string;
  type: "daily-quiz";
  quiz: import("../daily-quiz/dailyQuizTypes").DailyQuiz;
}

export interface FeedMythCard {
  id: string;
  type: "myth-or-tachles";
}

export interface FeedPremiumLearning {
  id: string;
  type: "premium-learning";
  moduleId: string;
  moduleIndex: number;
  chapterId: string;
  storeChapterId: string;
  moduleTitle: string;
  /** 6 infographic images in order */
  infographics: import("react-native").ImageSourcePropType[];
  /** Finn explanations for each step */
  finnExplanations?: string[];
  /** Dive mode: use single image with zoom regions instead of multiple images */
  diveMode?: boolean;
  /** Zoom regions for dive mode: [x%, y%, scale] per step */
  zoomRegions?: [number, number, number][];
  /** Tap zones mode: full-screen image, tap areas for popup explanations */
  tapZones?: boolean;
  tapZonesLayout?: 'left-right' | 'top-bottom';
  tapZoneLeft?: { title: string; text: string };
  tapZoneRight?: { title: string; text: string };
  tapZoneTop?: { title: string; text: string };
  tapZoneBottom?: { title: string; text: string };
  /** Single page view: just show image and finn text, no carousel or multiple zoom steps */
  singlePageView?: boolean;
  /** Index of the finnExplanation step where audio should play */
  finnAudioIndex?: number;
  /** URL for the finn explanation audio clip */
  finnAudioUrl?: string;
}

export interface FeedFinnHero {
  id: string;
  type: "finn-hero";
}

export interface FeedDilemma {
  id: string;
  type: "daily-dilemma";
}

export interface FeedInvestment {
  id: string;
  type: "daily-investment";
}

export interface FeedCrashGame {
  id: string;
  type: "crash-game";
}

export interface FeedSwipeGame {
  id: string;
  type: "swipe-game";
}

export interface FeedGrahamPersonality {
  id: string;
  type: "graham-personality";
}

export interface FeedBullshitSwipe {
  id: string;
  type: "bullshit-swipe";
}

export interface FeedHigherLower {
  id: string;
  type: "higher-lower";
}

export interface FeedBudgetNinja {
  id: string;
  type: "budget-ninja";
}

export interface FeedPriceSlider {
  id: string;
  type: "price-slider";
}

export interface FeedCashoutRush {
  id: string;
  type: "cashout-rush";
}

export interface FeedFomoKiller {
  id: string;
  type: "fomo-killer";
}

export interface FeedDidYouKnow {
  id: string;
  type: "did-you-know";
  /** Optional specific item id; if omitted the card rotates by day. */
  itemId?: string;
}

export interface FeedDiamondHands {
  id: string;
  type: "diamond-hands";
}

/** Shark opinion poll — "מה הכי אהבתם באפליקציה?" — random sample, non-persistent answer */
export interface FeedSharkFeedback {
  id: string;
  type: "shark-feedback";
}

export interface FeedSimulatorTeaser {
  id: string;
  type: "simulator-teaser";
  simulator: import("./feedSimulatorsData").FeedSimulator;
}

export type FeedItem = FeedVideo | FeedQuote | (FeedLesson & { type: "lesson" }) | FeedComic | FeedModuleHook | FeedMacroEvent | FeedScenario | FeedDailyQuiz | FeedMythCard | FeedPremiumLearning | FeedFinnHero | FeedDilemma | FeedInvestment | FeedCrashGame | FeedSwipeGame | FeedGrahamPersonality | FeedBullshitSwipe | FeedHigherLower | FeedBudgetNinja | FeedPriceSlider | FeedCashoutRush | FeedFomoKiller | FeedDidYouKnow | FeedDiamondHands | FeedSharkFeedback | FeedSimulatorTeaser;
