import type { ImageSourcePropType } from "react-native";

export interface Flashcard {
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
  interModuleGame?: 'investment' | 'crash' | 'myth' | 'dilemma' | 'macro-event';
  /** When interModuleGame === 'macro-event', the specific macro event id to show */
  interModuleMacroEventId?: string;
  /** When set to 'short', renders a FinPlay Short cinematic intro instead of InteractiveIntroCard */
  introVariant?: 'short';
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  pyramidLayer: number;
  modules: Module[];
}
