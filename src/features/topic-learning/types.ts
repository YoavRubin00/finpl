/**
 * Discrete component "kind" inside a module. Derived from existing fields on
 * the legacy Module type — no DB / data shape change needed.
 *
 * R5 (2026-06-10): `video-hook` and `tutorial-video` retired per Yoav's
 * spec ("תבטל את הסרטוני אינטרו בשיטה החדשה. רק האינטרו של שארק").
 * The hook video still plays inside the legacy LessonFlowScreen when
 * the user enters via the intro phase — it's just not a separate chip.
 */
export type TopicKind =
  | 'intro'
  /** Open-ended financial playground tied to the module's concept
   *  (compound calculator, budget tweaker, etc). Yoav 2026-06-10 reframed
   *  it as "ארגז חול" — distinct from `game`, which is a short scored
   *  mini-game. Sim has no win condition; game does. */
  | 'sim'
  /** Short scored mini-game from the inter-module-games registry. Only
   *  surfaces when `moduleGameMap` has a curated entry for the module. */
  | 'game'
  | 'cards'
  /** R5.5: brought back per Yoav — the mid-lesson explainer (e.g.
   *  fc-1-1-video for compound interest) was getting filtered out of
   *  the cards loop with no surface to reach it. Now it's its own
   *  chip, with the cards loop still filtering video flashcards so
   *  the user doesn't see them twice. */
  | 'tutorial-video'
  | 'recall'
  | 'podcast'
  | 'couple-dilemma'
  | 'quiz'
  | 'infographic'
  | 'post-video'
  /** R6 2026-06-10 — every module gets a chat chip wired to the main
   *  ChatScreen with topic-scoped preset questions (Yoav: "צאט עם
   *  המורה... החווית משתמש תהיה כמו של הצאט הראשי"). The resolver
   *  pins this kind to the second-to-last slot of every module's order
   *  so it always lands right before shark-dilemma / sim-late. */
  | 'chat'
  /** Shark-dilemma — Captain Shark "what would you do?" prompt that
   *  fires after the post-video celebration in the legacy flow. Surfaces
   *  here as its own chip because the data backing it (dilemmasData)
   *  exists for most modules including mod-1-1. */
  | 'shark-dilemma'
  /** Bonus CTA chip that deep-links into a full financial TOOL (e.g. the
   *  "נתח תלוש שכר" payslip analyzer), NOT a learning phase. Registered per
   *  module in `moduleToolMap.ts`, appended to the END of the accordion and
   *  REVEALED only past a completion %. Excluded from the completion math —
   *  it never counts toward the chest and is never marked "done". */
  | 'tool'
  /** Bonus in-app CAROUSEL chip — a swipeable set of branded cloud-hosted
   *  slides (the Instagram edu-carousel, minus its download CTA, since in-app
   *  the user is already playing). Registered per module in
   *  `moduleCarouselMap.ts`, opens an in-app sheet, excluded from the
   *  completion math (never counts toward the chest, never marked "done"). */
  | 'carousel';

/**
 * R5.11 (2026-06-10) — chip visual upgraded from emoji to Design System
 * SVG. Yoav shipped a ready icon pack (`assets/Design System.zip`) and
 * asked to use it instead of emojis. SVGs render via react-native-svg's
 * SvgXml; the raw markup lives in `./topicSvgs.ts`.
 */
export interface TopicIconAsset {
  /** Raw SVG markup. Rendered inside the chip's 78px circle at ~56px
   *  via <SvgXml xml={svgXml} width={56} height={56}/>. */
  svgXml: string;
}

export interface Topic {
  /** Stable id, format `${moduleId}:${kind}`. Used as the persisted progress
   *  key — DO NOT include any volatile state (timestamps, randomness). */
  id: string;
  moduleId: string;
  kind: TopicKind;
  /** Hebrew label shown on the chip. */
  titleHe: string;
  /** Asset for the chip icon — a single emoji per R5.2. */
  iconAsset: TopicIconAsset;
  /** Default ordering inside the module for the "Resume where I left off"
   *  CTA — smaller = earlier in the canonical sequence. NOT used to gate
   *  access; users can tap topics in any order. */
  defaultOrder: number;
}

/** Persisted entry per completed topic. Keep it tiny — no transcripts,
 *  scores, or audio offsets — those belong in the per-kind sub-stores. */
export interface TopicProgressEntry {
  completedAt: string; // ISO timestamp
}

export interface ModuleTopicSummary {
  completed: number;
  total: number;
  /** 0-100 */
  pct: number;
  /** True the first time `pct >= TOPIC_COMPLETION_THRESHOLD * 100`. Stays
   *  true forever once crossed — moves on the chest drop, never reverses. */
  isModuleDone: boolean;
  /** The first un-completed topic in canonical order, or null when all
   *  topics are done. Drives the "המשך מאיפה שעצרתי" CTA. */
  nextTopic: Topic | null;
}

/** 75% of resolved components done = module completed (chest opens). Single
 *  point of truth; bumping this re-grades every module's completion gate.
 *  Yoav 2026-06-22: raised 0.7 → 0.75 so the chest lands AFTER the quiz (the
 *  quiz is now pinned inside this window by topicResolver, replacing the old
 *  hard quiz-gate). */
export const TOPIC_COMPLETION_THRESHOLD = 0.75;

/** R8 T3.4 — chest rarity tiers, surface variable-reward dopamine.
 *  Brawl Stars / Clash Royale benchmarks: tiered chest rolls keep the
 *  user engaged past the "I already have one of those" plateau.
 *
 *  Distribution per roll (no pity): mythic 1%, rare 12%, common 87%.
 *  Pity timer kicks in after {@link PITY_TIMER_THRESHOLD} commons in a
 *  row — the next chest is GUARANTEED rare (no mythic upgrade, that
 *  stays luck-only).
 */
export type ChestRarity = 'common' | 'rare' | 'mythic';

/** Coin bonus multiplier stacked on top of the streak multiplier for
 *  each rarity. Common = no bonus (baseline). Rare adds 50%. Mythic
 *  triples the reward. Stays below the streak cap (×2.5) for common
 *  to avoid economy break, but mythic intentionally goes higher
 *  because it's < 1% drop rate. */
export const CHEST_RARITY_BONUS: Record<ChestRarity, number> = {
  common: 1,
  rare: 1.5,
  mythic: 3,
};

export const PITY_TIMER_THRESHOLD = 3;
export const MYTHIC_DROP_RATE = 0.01;
export const RARE_DROP_RATE = 0.12;

/** R8 T3.1 — per-module first-chest threshold override map. The default
 *  75% gate is fine for most modules but feels far in the very first onboarding
 *  module where the user is brand new and hasn't yet experienced a
 *  variable-reward drop. Lowering to 50% on mod-0-1 only gives the user their
 *  first chest at ~3-4 min in — Brawl Stars "90-second variable reward" rule
 *  applied to a learning context. Yoav 2026-06-22: scoped to mod-0-1 ALONE
 *  (mod-0-2 reverted to the 75% default).
 *
 *  IMPORTANT: only the first-chest gate is overridden here. The master 100%
 *  chest still requires every chip to be done.
 */
export const MODULE_CHEST_THRESHOLD: Record<string, number> = {
  'mod-0-1': 0.5,
};

/** Chest threshold by chapter (Yoav 2026-06-27): chapter 0 = 0.75 (mod-0-1 = 0.5,
 *  earliest dopamine); chapter 1+ = 0.90 so the chest lands at the very end and
 *  only the chat chip sits after it. Explicit MODULE_CHEST_THRESHOLD overrides win. */
export function chestThresholdFor(moduleId: string): number {
  if (MODULE_CHEST_THRESHOLD[moduleId] != null) return MODULE_CHEST_THRESHOLD[moduleId];
  return moduleId.startsWith('mod-0') ? TOPIC_COMPLETION_THRESHOLD : 0.9;
}

/** Explicit per-module CHIP-COUNT override for the chest gate — wins over the
 *  percentage math. mod-0-1 = 4 (Yoav 2026-07-03, supersedes ים's 3 of
 *  2026-07-02): the first-lesson path is intro → cards → **בואו נתרגל
 *  (recall) → quiz** → 🎁 — practice comes BEFORE the quiz and the chest
 *  fires only after the quiz. The quiz-pin in topicResolver derives from
 *  this same number (maxQuizIdx=3), and CANONICAL_ORDER already places
 *  recall before quiz, so no extra ordering code is needed. Rollback =
 *  restore 3 (criterion: daily lesson→chest < 60% for 3 days). */
export const MODULE_CHIPS_TO_CHEST: Record<string, number> = {
  'mod-0-1': 4,
};

/** Number of completed chips that opens the chest. Clamped to `total - 1` so the
 *  LAST chip (always `chat`) stays OUTSIDE the chest (Yoav 2026-06-27: "רק הצ'אט
 *  מחוץ לתיבה"). Single source of truth — used by the resolver's quiz-move, the
 *  accordion's isModuleDone, and the LessonFlowScreen auto-flow seam. */
export function chipsToChestFor(moduleId: string, total: number): number {
  const explicit = MODULE_CHIPS_TO_CHEST[moduleId];
  if (explicit != null) return Math.min(explicit, Math.max(1, total - 1));
  return Math.min(Math.ceil(chestThresholdFor(moduleId) * total), Math.max(1, total - 1));
}
