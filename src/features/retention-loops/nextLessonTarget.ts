import { chapter0Data } from '../chapter-0-content/chapter0Data';
import { chapter1Data } from '../chapter-1-content/chapter1Data';
import { chapter2Data } from '../chapter-2-content/chapter2Data';
import { chapter3Data } from '../chapter-3-content/chapter3Data';
import { chapter4Data } from '../chapter-4-content/chapter4Data';
import { chapter5Data } from '../chapter-5-content/chapter5Data';
import { PRO_LOCKED_SIMS } from '../../constants/proGates';
import { useCompletedModulesStore } from '../economy/useCompletedModulesStore';
import type { Module } from '../chapter-1-content/types';
import { lessonRouteFor } from '../topic-learning/topicResolver';
import { isModuleAccessible } from '../subscription/moduleAccess';
import { subscriptionQueryKey } from '../subscription/useSubscription';
import { queryClient } from '../../lib/queryClient';
import type { SubscriptionState } from '../../lib/api/subscription';

/**
 * "Where the journey continues" resolver for the tomorrow-chest surfaces
 * (map card cliffhanger + day-2 ceremony CTA).
 *
 * Mirrors DuoLearnScreen's first-incomplete calc (skip comingSoon + PRO-locked
 * sims) using the non-Pro view — a Pro user whose literal-next module is
 * PRO-locked gets pointed one module ahead, which is harmless (the map still
 * shows the locked one). Chapters imported directly (same data modules
 * DuoLearnScreen assembles as ALL_CHAPTERS).
 */

const ALL_CHAPTERS = [chapter0Data, chapter1Data, chapter2Data, chapter3Data, chapter4Data, chapter5Data];

export interface NextLessonTarget {
  moduleId: string;
  chapterId: string;
  title: string;
  /** The module's own curiosity one-liner (`videoHook`) — reused as the
   *  Zeigarnik cliffhanger ("מחר בפנים: ..."). Always in sync with content,
   *  zero copy duplication. Falls back to the title. */
  hook: string;
  /** Deep route straight into the lesson (same shape the module-first
   *  experiment uses) — no map hunting on day-2. */
  route: string;
}

/** The lesson the end-of-lesson CTA starts, with what makes it concrete. */
export interface NextLessonAfter extends NextLessonTarget {
  module: Module;
  /** Rough time to the chest, in minutes. An estimate from the amount of
   *  content (the app has no per-module duration field) - always shown as "כ-". */
  minutes: number;
}

/** ~1 minute of intro, ~15s a card, ~20s a question; clamped to the 2-7 minute
 *  range the daily-quest copy already promises ("3-7 דקות"). */
function estimateMinutes(mod: Module): number {
  const seconds = 60 + (mod.flashcards?.length ?? 0) * 15 + (mod.quizzes?.length ?? 0) * 20;
  return Math.min(7, Math.max(2, Math.round(seconds / 60)));
}

/**
 * The lesson that follows `moduleId`, for the "next lesson" CTA on the chest.
 *
 * Walks FORWARD from the lesson just finished (same chapter, then the next
 * ones) so a user who jumped ahead (investments fast-track) continues where
 * they are, not back at chapter 0. Falls back to the first incomplete lesson.
 * Returns null when the candidate is not open to this user (locked chapter,
 * Pro-only lesson) - the CTA then leads to the map, where the locked node and
 * the Pro chip explain why. This never routes a free user into a Pro gate.
 */
export function getNextLessonAfter(moduleId: string): NextLessonAfter | null {
  const completed = useCompletedModulesStore.getState().completedIds;
  const isPro = queryClient.getQueryData<SubscriptionState | null>(subscriptionQueryKey)?.isPro === true;
  const flat = ALL_CHAPTERS.flatMap((chapter) => chapter.modules.map((mod) => ({ chapterId: chapter.id, mod: mod as Module })));
  const startIdx = flat.findIndex((entry) => entry.mod.id === moduleId);
  const isCandidate = (mod: Module): boolean =>
    mod.id !== moduleId && !mod.comingSoon && !completed.includes(mod.id) && (isPro || !PRO_LOCKED_SIMS.has(mod.id));
  const found =
    flat.slice(startIdx + 1).find((entry) => isCandidate(entry.mod)) ??
    flat.find((entry) => isCandidate(entry.mod));
  if (!found) return null;
  if (!isModuleAccessible(found.mod.id, found.chapterId)) return null;
  const hookSource = typeof found.mod.videoHook === 'string' ? found.mod.videoHook.trim() : '';
  return {
    moduleId: found.mod.id,
    chapterId: found.chapterId,
    title: found.mod.title,
    hook: hookSource.length > 0 ? hookSource : found.mod.title,
    route: lessonRouteFor(found.mod, found.chapterId),
    module: found.mod,
    minutes: estimateMinutes(found.mod),
  };
}

export function getNextLessonTarget(): NextLessonTarget | null {
  const completed = useCompletedModulesStore.getState().completedIds;
  for (const chapter of ALL_CHAPTERS) {
    for (const mod of chapter.modules) {
      if (mod.comingSoon) continue;
      if (PRO_LOCKED_SIMS.has(mod.id)) continue;
      if (completed.includes(mod.id)) continue;
      const hookSource = typeof mod.videoHook === 'string' ? mod.videoHook.trim() : '';
      return {
        moduleId: mod.id,
        chapterId: chapter.id,
        title: mod.title,
        hook: hookSource.length > 0 ? hookSource : mod.title,
        route: `/lesson/${mod.id}?chapterId=${chapter.id}&startPhase=intro&returnTo=topic-tree`,
      };
    }
  }
  return null;
}
