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
  SVG_SANDBOX,
  SVG_TIP,
  SVG_GAME,
  SVG_LESSON,
} from './topicSvgs';

/**
 * R5.14 (2026-06-10) — split sim (sandbox/open-ended exploration) from
 * game (short scored mini-game). They were collapsed before because
 * only `sim` existed in the schema; now they're distinct kinds with
 * distinct glyphs so the user can tell them apart at a glance
 * ("הסימולטור צריך עיצוב אחר לכפתור שלו").
 *
 * R5.13 retired infographic (light bulb); R5.12 retired post-video.
 * Their SVG_TIP / SVG_GAME assignments below remain so the icons stay
 * referenced (and tree-shake-stable). post-video and infographic kinds
 * survive in TopicKind but the resolver never surfaces them anymore.
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
  // Sandbox box with shovel — open-ended financial play (calc, tweak,
  // explore). Distinct from `game` so they don't both read as "gamepad".
  'sim': { svgXml: SVG_SANDBOX },
  // Purple controller — scored short mini-game from the inter-module
  // games registry. Visually echoes the simulator green controller but
  // in a different color, so the pair reads as "two play surfaces".
  'game': { svgXml: SVG_GAME },
  // Light bulb — retained for legacy `infographic` references.
  'infographic': { svgXml: SVG_TIP },
  // Purple controller — retained for legacy `post-video` references.
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
  'sim': 'ארגז חול',
  'game': 'משחק',
  'infographic': 'אינפוגרפיקה',
  'post-video': 'סרטון סיכום',
  'shark-dilemma': 'דילמה',
};
