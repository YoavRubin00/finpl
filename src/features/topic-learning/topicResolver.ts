import type { Module } from '../chapter-1-content/types';
import type { Topic, TopicKind } from './types';
import { TOPIC_ICONS, TOPIC_LABELS } from './topic-icons';

/**
 * Canonical order used when no completion progress exists. Mirrors the
 * legacy LessonFlowScreen sequence so first-time users see the same flow
 * as before if they hit "המשך מאיפה שעצרתי" all the way through.
 *
 * Sim is intentionally placed after the recall+quiz pair (not earlier),
 * matching the "normal module" path; SIM_FIRST modules are handled by the
 * caller via `simFirst` option.
 */
const CANONICAL_ORDER: TopicKind[] = [
  'video-hook',
  'intro',
  'cards',
  'recall',
  'podcast',
  'couple-dilemma',
  'quiz',
  'sim',
  'infographic',
  'post-video',
];

const SIM_FIRST_ORDER: TopicKind[] = [
  'video-hook',
  'intro',
  'sim',
  'cards',
  'recall',
  'podcast',
  'couple-dilemma',
  'quiz',
  'infographic',
  'post-video',
];

function buildTopic(kind: TopicKind, moduleId: string, order: number): Topic {
  return {
    id: `${moduleId}:${kind}`,
    moduleId,
    kind,
    titleHe: TOPIC_LABELS[kind],
    iconAsset: TOPIC_ICONS[kind],
    defaultOrder: order,
  };
}

export interface ResolveTopicsOptions {
  /** When true, sim becomes a "core early" topic rather than late. Set
   *  from the module's MODULE_OVERRIDES.SIM_FIRST list (LessonFlowScreen
   *  encodes that today). */
  simFirst?: boolean;
}

/**
 * Derive the discrete topic list from a module's existing optional fields.
 * Add-only: a future TopicKind requires touching this resolver plus the
 * three sibling files (`types`, `topic-icons`, `playerAdapters/`). No
 * data migration needed — modules without the source field simply skip
 * that topic.
 */
export function resolveTopics(module: Module, opts: ResolveTopicsOptions = {}): Topic[] {
  const order = opts.simFirst ? SIM_FIRST_ORDER : CANONICAL_ORDER;
  const present = new Map<TopicKind, boolean>();

  if (module.videoHookAsset) present.set('video-hook', true);
  if (module.interactiveIntro?.trim()) present.set('intro', true);
  if (module.flashcards?.length) present.set('cards', true);
  // 'recall' isn't yet a discriminating field on Module — gated on flashcards
  // for now since recall reuses flashcard content in LessonFlowScreen. The
  // adapter layer is where this becomes an explicit toggle later.
  if (module.flashcards?.length) present.set('recall', true);
  if (module.podcast) present.set('podcast', true);
  if (module.coupleDilemma) present.set('couple-dilemma', true);
  if (module.quizzes?.length) present.set('quiz', true);
  if (module.simConcept) present.set('sim', true);
  // Every module currently surfaces an infographic + post-celebration video,
  // so they're unconditional — keep that until a flagged module turns out
  // to legitimately lack one.
  present.set('infographic', true);
  present.set('post-video', true);

  const out: Topic[] = [];
  order.forEach((kind, idx) => {
    if (present.get(kind)) out.push(buildTopic(kind, module.id, idx));
  });
  return out;
}
