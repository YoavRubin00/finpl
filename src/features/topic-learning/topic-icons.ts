import {
  StickyNote,
  BookA,
  Mic,
  GitFork,
  HelpCircle,
  BookOpen,
  BarChart3,
  Trophy,
} from 'lucide-react-native';
import type { TopicKind, TopicIconAsset } from './types';

/**
 * Icon spec per topic kind. R5 (2026-06-10) introduces a flat-tile design
 * Yoav approved: pastel-rounded-square + Lucide icon centered. The
 * `intro` chip is the only Lottie kept — keeps Captain Shark waving as
 * the "personal greeting" affordance, per his exact instruction
 * "רק האינטרו של שארק".
 *
 * Pastel palette is hand-tuned from his reference image; bg is the
 * tile fill, fg is the Lucide stroke. Both pulled from the same
 * Tailwind hue at different luminance so they read as one badge.
 */
export const TOPIC_ICONS: Record<TopicKind, TopicIconAsset> = {
  // Lottie — Yoav wanted only the Shark intro to stay animated.
  'intro': {
    type: 'lottie',
    asset: require('../../../assets/lottie/fin-excited.json'),
  },
  'cards': {
    type: 'tile',
    icon: StickyNote,
    bg: '#fef3c7', // amber-100
    fg: '#d97706', // amber-600
  },
  // No direct match in the reference; recall = sentence completion =
  // vocabulary practice → "מילון" (Glossary) glyph + indigo.
  'recall': {
    type: 'tile',
    icon: BookA,
    bg: '#e0e7ff', // indigo-100
    fg: '#4338ca', // indigo-700
  },
  'podcast': {
    type: 'tile',
    icon: Mic,
    bg: '#ede9fe', // violet-100
    fg: '#6d28d9', // violet-700
  },
  'couple-dilemma': {
    type: 'tile',
    icon: GitFork,
    bg: '#d1fae5', // emerald-100
    fg: '#047857', // emerald-700
  },
  'quiz': {
    type: 'tile',
    icon: HelpCircle,
    bg: '#dbeafe', // blue-100
    fg: '#1e40af', // blue-800
  },
  // R5.1 2026-06-10 — Yoav reported the Gamepad icon was opening the
  // infographic phase; the icons in his reference attach BarChart to
  // "סימולטור" and BookOpen to "שיעור". Swapped accordingly: sim
  // (interactive calc/sim) gets the chart, infographic (summary card)
  // gets the lesson-book glyph.
  'sim': {
    type: 'tile',
    icon: BarChart3,
    bg: '#cffafe', // cyan-100
    fg: '#0e7490', // cyan-700
  },
  'infographic': {
    type: 'tile',
    icon: BookOpen,
    bg: '#d1fae5', // emerald-100 — "Lesson" tile in the reference
    fg: '#065f46', // emerald-800
  },
  'post-video': {
    type: 'tile',
    icon: Trophy,
    bg: '#fef3c7', // amber-100 — celebratory gold
    fg: '#b45309', // amber-700
  },
};

/** Hebrew label shown on the chip. Singular, gender-neutral per BRAND.md. */
export const TOPIC_LABELS: Record<TopicKind, string> = {
  'intro': 'אינטרו',
  'cards': 'כרטיסיות',
  'recall': 'השלמת משפטים',
  'podcast': 'פודקאסט',
  'couple-dilemma': 'דילמה זוגית',
  'quiz': 'קוויז',
  'sim': 'סימולטור',
  'infographic': 'אינפוגרפיקה',
  'post-video': 'סרטון סיכום',
};
