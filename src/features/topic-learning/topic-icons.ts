import type { TopicKind, TopicIconAsset } from './types';

/**
 * Asset map per topic kind. Falls back to existing Lottie assets in
 * `assets/lottie/` to ship the pilot without waiting on bespoke Stitch
 * artwork. When the Claude-Design octagonal SVGs land they replace the
 * `require()` entries here one-for-one.
 *
 * Why Lottie vs PNG: every entry here is fed into TopicChip, which renders
 * with `LottieView` for animated states. If a kind eventually receives a
 * static PNG instead, TopicChip will route via `expo-image`.
 */
export const TOPIC_ICONS: Record<TopicKind, TopicIconAsset> = {
  'video-hook': require('../../../assets/lottie/wired-flat-29-play-pause-circle-hover-pinch.json'),
  // Captain Finn waving — sets a "your guide is greeting you" vibe rather
  // than the generic generic Finn standard. WebP, not Lottie — TopicChip
  // branches on the asset shape.
  'intro': require('../../../assets/webp/fin-hello.webp') as TopicIconAsset,
  'cards': require('../../../assets/lottie/wired-flat-3154-cards-club-hover-pinch.json'),
  'recall': require('../../../assets/lottie/wired-flat-426-brain-hover-pinch.json'),
  'podcast': require('../../../assets/lottie/wired-flat-688-speaker-lecturer-male-hover-pinch.json'),
  'couple-dilemma': require('../../../assets/lottie/wired-flat-20-love-heart-hover-heartbeat.json'),
  'quiz': require('../../../assets/lottie/wired-flat-424-question-bubble-hover-wiggle.json'),
  'sim': require('../../../assets/lottie/wired-flat-2258-online-learning-hover-pinch.json'),
  // diversified bar chart reads as "infographic summary" more clearly than
  // a single line graph (which is too "sim/trading"). Keeps cards (deck
  // of cards) and infographic (bars+rays) visually distinct.
  'infographic': require('../../../assets/lottie/wired-flat-166-bar-chart-diversified-double-hover-growth.json'),
  'post-video': require('../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json'),
};

/** Hebrew label shown on the chip. Singular, gender-neutral per BRAND.md. */
export const TOPIC_LABELS: Record<TopicKind, string> = {
  'video-hook': 'טריילר',
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
