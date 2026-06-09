import type { AnimationObject } from 'lottie-react-native';
import type { LucideIcon } from 'lucide-react-native';

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

/** Visual spec for a TopicChip in the new icon-tile style (Yoav R5):
 *  pastel rounded square + filled Lucide icon centered. */
export interface TopicTileSpec {
  type: 'tile';
  /** Lucide React Native icon component. */
  icon: LucideIcon;
  /** Tile background — pastel from the chapter palette. */
  bg: string;
  /** Icon stroke / fill — saturated counterpart of bg. */
  fg: string;
}

/** Lottie spec — kept for the intro chip which Yoav explicitly wanted
 *  to remain animated ("רק האינטרו של שארק"). */
export interface TopicLottieSpec {
  type: 'lottie';
  asset: AnimationObject;
}

export type TopicIconAsset = TopicTileSpec | TopicLottieSpec;

export interface Topic {
  /** Stable id, format `${moduleId}:${kind}`. Used as the persisted progress
   *  key — DO NOT include any volatile state (timestamps, randomness). */
  id: string;
  moduleId: string;
  kind: TopicKind;
  /** Hebrew label shown on the chip. */
  titleHe: string;
  /** Asset for the chip icon — either a colored tile or a Lottie file. */
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
