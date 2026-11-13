import { track, type PostLessonModalKind } from '../../lib/analytics/events';

/**
 * Post-lesson modal sequence counter (13.11.26).
 *
 * After a lesson the user could meet a chest, a double-or-nothing prompt, a
 * signup gate, a profile question, a tool nudge, a rate prompt, a Pro teaser
 * and a paywall - opened by different hosts that do not know about each other.
 * Nothing measured how many of them one completion really produced.
 *
 * The chest opens a sequence; every later modal reports itself here and gets
 * its position (`index`). `post_lesson_modal_shown` with index >= 3 is stacking.
 * A modal that opens with no chest behind it (app open, a different day) is
 * not post-lesson and is not reported.
 */

/** A modal counts as "after the lesson" for this long after the chest. */
const SEQUENCE_WINDOW_MS = 3 * 60 * 1000;

let activeModuleId: string | null = null;
let startedAtMs = 0;
let count = 0;

/** Called by the chest celebration when it is presented. Reports index 1. */
export function beginPostLessonSequence(moduleId: string): void {
  activeModuleId = moduleId;
  startedAtMs = Date.now();
  count = 0;
  reportPostLessonModal('chest');
}

/** True while the user is still inside the end-of-lesson moment. */
export function isPostLessonSequenceActive(): boolean {
  return activeModuleId !== null && Date.now() - startedAtMs < SEQUENCE_WINDOW_MS;
}

/** Called by any modal that may open after a lesson. No-op outside a sequence. */
export function reportPostLessonModal(kind: PostLessonModalKind): void {
  if (!isPostLessonSequenceActive() || activeModuleId === null) return;
  count += 1;
  try {
    track({ name: 'post_lesson_modal_shown', props: { kind, index: count, module_id: activeModuleId } });
  } catch { /* analytics must never break the reward flow */ }
}

/** The user left the end-of-lesson moment (started the next lesson). */
export function endPostLessonSequence(): void {
  activeModuleId = null;
}
