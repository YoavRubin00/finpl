import type { ImageSourcePropType } from "react-native";

/**
 * ── Living-lesson content (Yoav 2026-08-01) ──
 * Replaces the PNG-infographic fly-through inside lessons. A flashcard that
 * defines `segments` renders as the new animated text experience: segments
 * reveal one-by-one (tap to advance), **word** marks an emphasized keyword,
 * [[term]] keeps linking to the glossary, and each segment may carry ONE
 * visual primitive that ILLUSTRATES the point with motion instead of a
 * static infographic. The retired PNG infographics live on as the module's
 * collectible summary deck (see card-collection feature).
 */
export type FlashcardVisual =
  /** Bundled Lottie icon-animation (assets/lottie), the lightweight default */
  | { kind: "lottie"; source: number; caption?: string }
  /** Animated number counting from→to (e.g. 100K → 761K) */
  | {
      kind: "counter";
      from: number;
      to: number;
      prefix?: string;
      suffix?: string;
      caption?: string;
      /** Format with thousands separators (default true) */
      grouping?: boolean;
    }
  /** Bars racing to their values — comparisons (5% vs 7%, bank vs market) */
  | {
      kind: "compare-bars";
      items: Array<{ label: string; value: number; color?: string; valueLabel?: string }>;
      caption?: string;
    }
  /** A line that draws itself — growth curves, exponential take-off */
  | { kind: "grow-line"; points: number[]; caption?: string; highlightLastPoint?: boolean }
  /** Coins/blocks stacking up step by step — accumulation, savings */
  | { kind: "coin-stack"; steps: number[]; caption?: string }
  /** One amount splitting into labeled parts — budgets, salary breakdown */
  | {
      kind: "split-flow";
      total?: number;
      parts: Array<{ label: string; pct: number; color?: string }>;
      caption?: string;
    }
  /** Horizontal timeline with milestone dots revealing in order */
  | { kind: "timeline"; milestones: Array<{ label: string; sublabel?: string }>; caption?: string }
  /**
   * A TEXT-FREE illustration from the retired infographic set (Yoav 1.8:
   * only image-only art rides inside the living lesson — PNGs with baked-in
   * text stay out; their text lives in the segments). Resolved through
   * INFOGRAPHIC_MAP by the original card id, so proxying/caching still apply.
   */
  | { kind: "image"; infographicCardId: string; caption?: string };

export interface FlashcardSegment {
  /** Segment body. Supports [[glossary-term]] and **emphasis** markup. */
  text: string;
  /** Optional single visual that animates in with this segment */
  visual?: FlashcardVisual;
  /** Optional Finn line shown with this segment (replaces dive finnExplanations) */
  finnLine?: string;
}

export interface Flashcard {
  /**
   * When present, the card renders as the living-lesson experience and the
   * legacy infographic/diveMode fields below are ignored for display.
   */
  segments?: FlashcardSegment[];
  id: string;
  text: string;
  imageUrl?: ImageSourcePropType; // e.g. require('../../assets/comics/mod1.png') or string URI
  isComic?: boolean; // If true, renders as a comic flashcard
  finnTip?: string; // If set, shows a Finn notification popup with this text before advancing
  finnTipMood?: 'standard' | 'empathic' | 'happy'; // Controls which mascot expression is shown in the finnTip popup (default: standard)
  isMeme?: boolean; // If true, renders as a meme break card (no XP/progress)
  memeImage?: ImageSourcePropType; // The meme image (local require or uri)
  hideTextOverlay?: boolean; // If true, hides the Finn text bubble on meme cards and top-aligns the image
  topAudio?: { uri: string }; // Optional Captain Shark audio for the main text
  videoUri?: string; // If set, renders as a full-screen video flashcard
  diveMode?: boolean; // If true, renders as a single image with zoom steps
  hideTextOnDive?: boolean; // If true, the main text disappears when diveMode advances to step > 0
  zoomRegions?: [number, number, number][]; // [translateX, translateY, scale] for each step
  finnExplanations?: string[]; // Explanation text for each step in diveMode
  isInteractiveChart?: boolean; // If true, renders a full-screen interactive chart component
  chartId?: 'ta125_war_recovery'; // Identifier for which chart to render
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  successFeedback: string;
  failFeedback: string;
  type: 'multiple-choice' | 'scenario';
  conceptTag: string;
  needsCalculator?: boolean;
}

export interface SimConcept {
  id: string;
  title: string;
  description: string;
}

export interface PodcastQuestionOption {
  text: string;
  isCorrect: boolean;
  feedback: string;
}

export interface PodcastQuestion {
  id: string;
  type: 'comprehension' | 'dilemma';
  question: string;
  options: PodcastQuestionOption[];
  xpReward: number;
  coinReward: number;
}

export interface PodcastSegment {
  id: string;
  title: string;
  audio: { uri: string };
  durationSec: number;
  transcript: string;
  comprehensionQuiz: PodcastQuestion;
  dilemmaQuiz: PodcastQuestion;
}

export interface CoupleDilemmaOption {
  id: 'a' | 'b';
  /** ≤24 chars, shown as the side hint label on the swipe card */
  label: string;
  isWise: boolean;
  /** Daisy's commentary in the feedback layer, ≤100 chars */
  feedback: string;
}

export interface CoupleDilemmaSegment {
  id: string;
  /** Vercel Blob mp4, 5s, 9:16, streamed via expo-video */
  videoUri: string;
  /** Vercel Blob mp3, ~5s of Daisy narration over the video */
  narrationAudioUri: string;
  /** Overlay text on the video, RTL, ≤32 chars */
  caption: string;
  /** Scenario question shown on the swipe card */
  scenario: string;
  /** Right-swipe option */
  optionA: CoupleDilemmaOption;
  /** Left-swipe option */
  optionB: CoupleDilemmaOption;
}

export interface Module {
  id: string;
  title: string;
  videoHook: string;
  videoHookAsset?: { uri: string };
  interactiveIntro: string;
  introAudio?: { uri: string };
  introImage?: { uri: string };
  flashcards: Flashcard[];
  quizzes: QuizQuestion[];
  simConcept: SimConcept;
  comingSoon?: boolean;
  /** Bonus modules don't block chapter progression and show a special badge */
  bonusModule?: boolean;
  /** Label shown on bonus badge, e.g. "בונוס: המשקיע הנבון" */
  bonusLabel?: string;
  /** Optional mini-game to show between this module and the next */
  interModuleGame?:
    | 'investment'
    | 'crash'
    | 'myth'
    | 'dilemma'
    | 'macro-event'
    | 'video'
    | 'fomo-killer'
    | 'bullshit-swipe'
    | 'higher-lower'
    | 'price-slider'
    | 'budget-ninja'
    | 'cashout-rush'
    | 'diamond-hands'
    | 'crowd-question'
    | 'payslip-bonus'
    | 'scenario-lab';
  /** When interModuleGame === 'macro-event', the specific macro event id to show */
  interModuleMacroEventId?: string;
  /** When interModuleGame === 'video', the video asset to play */
  interModuleVideoAsset?: { uri: string } | number;
  /** When interModuleGame === 'video', message shown by Finn after video ends */
  interModuleFinnMessage?: string;
  /**
   * Bite-sized Feed-style content to surface between this module and the next.
   * Picks the FIRST present field; each id must exist in its respective
   * catalog (see src/features/{premium-learning,did-you-know,live-news,
   * live-market}/). All fields are optional — module data assigns whichever
   * topical card best reinforces what the user just learned. Replaces the
   * legacy FinFeedScreen (removed) as the surface for these cards.
   */
  interModuleContent?: {
    /** PremiumLearningCard id from src/features/premium-learning/data.ts */
    premiumLearning?: string;
    /** Did-you-know fact id from src/features/did-you-know/didYouKnowData.ts */
    didYouKnow?: string;
    /** Live market ticker — renders the live-market card for that ticker */
    liveMarketTicker?: string;
    /** Live news item id (one-off news quiz) */
    liveNewsId?: string;
  };
  /** When set to 'short', renders a FinPlay Short cinematic intro instead of InteractiveIntroCard */
  introVariant?: 'short';
  /** Optional 20-second podcast segment with two follow-up questions (comprehension + dilemma) */
  podcast?: PodcastSegment;
  /** Optional 5-second couple-dilemma video + Daisy narration + Tinder swipe choice */
  coupleDilemma?: CoupleDilemmaSegment;
  /**
   * Learning architecture flag (pilot 2026-06-09). When `'topic-tree'`, a
   * tap on this module opens the new TopicTreeOverlay (sub-components +
   * growing tree). Default (undefined) falls through to the legacy
   * LessonFlowScreen. Only mod-1-1 is on the new track at pilot launch.
   */
  learningMode?: 'topic-tree' | 'linear-flow';
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  pyramidLayer: number;
  modules: Module[];
}
