import type { TopicKind, TopicIconAsset } from './types';
import {
  SVG_INTRO,
  SVG_CARDS,
  SVG_VIDEO,
  SVG_BRAIN,
  SVG_PODCAST,
  SVG_SCENARIO,
  SVG_QUIZ,
  SVG_SIMULATOR,
  SVG_TIP,
  SVG_GAME,
  SVG_LESSON,
} from './topicSvgs';

/**
 * R5.11 (2026-06-10) — chip icons swapped from emoji to the Design
 * System SVG pack Yoav shipped ("תשתמש ברכיבים האלה במקום באמוגים").
 * Mapping rationale below; tweak by swapping the SVG_* constants.
 */
export const TOPIC_ICONS: Record<TopicKind, TopicIconAsset> = {
  // Flag with star — welcome / start banner.
  'intro': { svgXml: SVG_INTRO },
  // Stacked cards.
  'cards': { svgXml: SVG_CARDS },
  // Film/play frame, red.
  'tutorial-video': { svgXml: SVG_VIDEO },
  // Brain, pink.
  'recall': { svgXml: SVG_BRAIN },
  // Microphone on a stand, purple.
  'podcast': { svgXml: SVG_PODCAST },
  // Two-arrow split — fits binary "what would you choose" decision.
  'couple-dilemma': { svgXml: SVG_SCENARIO },
  // Clipboard with check.
  'quiz': { svgXml: SVG_QUIZ },
  // Green controller — gamification of the sim.
  'sim': { svgXml: SVG_SIMULATOR },
  // Light bulb — insight / "the moment it clicks".
  'infographic': { svgXml: SVG_TIP },
  // Purple controller — the celebratory wrap-up after the sim/cards.
  'post-video': { svgXml: SVG_GAME },
  // Blue document — Captain Shark's brief / advisory scenario.
  'shark-dilemma': { svgXml: SVG_LESSON },
};

/** Hebrew label shown on the chip. Singular, gender-neutral per BRAND.md. */
export const TOPIC_LABELS: Record<TopicKind, string> = {
  'intro': 'אינטרו',
  'cards': 'כרטיסיות',
  'tutorial-video': 'סרטון הסבר',
  'recall': 'השלמת משפטים',
  'podcast': 'פודקאסט',
  'couple-dilemma': 'דילמה זוגית',
  'quiz': 'קוויז',
  'sim': 'סימולטור',
  'infographic': 'אינפוגרפיקה',
  'post-video': 'סרטון סיכום',
  'shark-dilemma': 'דילמה',
};
