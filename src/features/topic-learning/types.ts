import type { ImageRequireSource } from 'react-native';
import type { AnimationObject } from 'lottie-react-native';

/** Asset acceptable to either expo-image or LottieView. Required to carry
 *  the proper shape so each topic kind can supply either bitmap or Lottie
 *  artwork without losing type info at the chip layer. */
export type TopicIconAsset = ImageRequireSource | AnimationObject;

/**
 * Discrete component "kind" inside a module. Derived from existing fields on
 * the legacy Module type — no DB / data shape change needed. Adding a new
 * kind here is also where you wire it into topicResolver + topic-icons +
 * playerAdapters/.
 */
export type TopicKind =
  | 'video-hook'
  | 'intro'
  | 'cards'
  | 'recall'
  | 'podcast'
  | 'couple-dilemma'
  | 'quiz'
  | 'sim'
  | 'infographic'
  | 'post-video';

export interface Topic {
  /** Stable id, format `${moduleId}:${kind}`. Used as the persisted progress
   *  key — DO NOT include any volatile state (timestamps, randomness). */
  id: string;
  moduleId: string;
  kind: TopicKind;
  /** Hebrew label shown on the chip. */
  titleHe: string;
  /** Asset for the chip icon. Either an `expo-image` source (numeric
   *  require) or a Lottie JSON. The TopicChip renderer decides. */
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
