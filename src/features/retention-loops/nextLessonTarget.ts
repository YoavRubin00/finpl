import { chapter0Data } from '../chapter-0-content/chapter0Data';
import { chapter1Data } from '../chapter-1-content/chapter1Data';
import { chapter2Data } from '../chapter-2-content/chapter2Data';
import { chapter3Data } from '../chapter-3-content/chapter3Data';
import { chapter4Data } from '../chapter-4-content/chapter4Data';
import { chapter5Data } from '../chapter-5-content/chapter5Data';
import { PRO_LOCKED_SIMS } from '../../constants/proGates';
import { useCompletedModulesStore } from '../economy/useCompletedModulesStore';

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
