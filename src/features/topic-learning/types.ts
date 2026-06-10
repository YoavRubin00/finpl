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
  /** Shark-dilemma — Captain Shark "what would you do?" prompt that
   *  fires after the post-video celebration in the legacy flow. Surfaces
   *  here as its own chip because the data backing it (dilemmasData)
   *  exists for most modules including mod-1-1. */
  | 'shark-dilemma';

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

/** 70% of resolved components done = module completed. Single point of
 *  truth; bumping this re-grades every module's completion gate. */
export const TOPIC_COMPLETION_THRESHOLD = 0.7;
