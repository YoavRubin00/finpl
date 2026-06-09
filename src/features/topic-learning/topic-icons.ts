import type { TopicKind, TopicIconAsset } from './types';

/**
 * Per-kind emoji glyph used inside the circular topic chip. R5.2
 * picks one emoji per kind to match the outer ModuleNode style
 * (Yoav 2026-06-10: "שיראו כמו הכפתורים של המודולות. תשתמש גם
 * באמוגים"). Optimized for legibility at 28px font size.
 */
export const TOPIC_ICONS: Record<TopicKind, TopicIconAsset> = {
  // 👋 — Yoav 2026-06-10 ("תשים באינטרו משהוא אחר, לא כריש"). The
  // waving hand reads as a personal "welcome / let's start" affordance
  // without being literal about Captain Shark — the mascot still owns
  // the intro screen's content, just not the chip.
  'intro': { emoji: '👋' },
  'cards': { emoji: '📑' },
  'tutorial-video': { emoji: '🎬' },
  'recall': { emoji: '🧠' },
  'podcast': { emoji: '🎙️' },
  'couple-dilemma': { emoji: '⚖️' },
  'quiz': { emoji: '🎯' },
  // 📈 — compound-interest growth chart, the natural sim metaphor for
  // mod-1-1. Other modules' sims can read it as "interactive viz" too.
  'sim': { emoji: '📈' },
  'infographic': { emoji: '📖' },
  'post-video': { emoji: '🏆' },
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
};
