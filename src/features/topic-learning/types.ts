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
  | 'cards'
  | 'recall'
  | 'podcast'
  | 'couple-dilemma'
  | 'quiz'
  | 'sim'
  | 'infographic'
  | 'post-video';

/**
 * R5.2 (2026-06-10) — chip visual is now an emoji string. Matches the
 * outer ModuleNode style Yoav explicitly pointed to ("שיראו כמו
 * הכפתורים של המודולות. לא ריבוע מעוגל בקצוות. תשתמש גם באמוגים").
 * Lottie + tile palettes were retired — uniformity beats variety on
 * this surface.
 */
export interface TopicIconAsset {
  /** Single grapheme cluster — rendered inside a circular 78px button
   *  the same way DuoLearnScreen's outer ModuleNode renders module
   *  emojis. Pick something that reads at 28px font size. */
  emoji: string;
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

/** 70% of resolved components done = module completed. Single point of
 *  truth; bumping this re-grades every module's completion gate. */
export const TOPIC_COMPLETION_THRESHOLD = 0.7;
