/**
 * Pearl content map — defines what plays inside each Pearl node on the
 * Duolingo-style learn path. A Pearl sits BETWEEN moduleA (`afterModuleId`)
 * and the module that follows it; once moduleA is completed, the Pearl
 * unlocks. Entering it is OPTIONAL — the next module is also unlocked, so
 * users who skip the Pearl lose nothing.
 *
 * Sources of truth — we deliberately don't duplicate config that already
 * lives elsewhere:
 *   - The mini-game per pearl comes from `chapter.modules[i].interModuleGame`
 *     (defined in chapter0Data.ts / chapter1Data.ts). The Pearl is the new
 *     visible surface for that already-assigned game.
 *   - The lifestyle video comes from `pickNextLifestyleVideo()` in
 *     inter-module-break/lifestyleVideoConfig.ts so users see fresh clips
 *     across pearls (not a hard-coded mapping).
 *   - Profile-question fallbacks (chapter 0 only) come from
 *     PROFILE_QUESTION_BACKSTOPS — we surface them here only if the user
 *     didn't answer them during the source module's "Continue" flow.
 */

import { chapter0Data } from '../chapter-0-content/chapter0Data';
import { chapter1Data } from '../chapter-1-content/chapter1Data';
import { chapter2Data } from '../chapter-2-content/chapter2Data';
import { chapter3Data } from '../chapter-3-content/chapter3Data';
import { chapter4Data } from '../chapter-4-content/chapter4Data';
import { chapter5Data } from '../chapter-5-content/chapter5Data';
import type { ProfileQuestionKind } from '../onboarding/InModuleProfileQuestion';

const ALL_CHAPTERS = [
  chapter0Data,
  chapter1Data,
  chapter2Data,
  chapter3Data,
  chapter4Data,
  chapter5Data,
];

export type InterModuleGameKey =
  | 'investment'
  | 'crash'
  | 'myth'
  | 'dilemma'
  | 'macro-event'
  | 'video'
  | 'fomo-killer'
  | 'bullshit-swipe'
  | 'higher-lower'
  | 'price-slider'
  | 'budget-ninja'
  | 'cashout-rush';

export interface PearlContent {
  /** The id of the module the Pearl sits AFTER. The Pearl unlocks when
   *  this module is completed. */
  afterModuleId: string;
  /** The id of the module that immediately follows — this is where the
   *  Pearl auto-advances to on completion. May be undefined for the very
   *  last module in the path (no Pearl is created in that case). */
  nextModuleId: string;
  /** Which mini-game to play inside the Pearl. Pulled from the source
   *  module's interModuleGame so each Pearl naturally matches the topic
   *  of the module that just ended (e.g., investment-module → investment
   *  game). */
  gameKey: InterModuleGameKey;
  /** If the source module was supposed to ask an onboarding profile
   *  question on its Continue tap (chapter 0 only) and the user skipped,
   *  the Pearl will offer it again as a soft prompt. The Pearl checks
   *  useAuthStore at runtime — if already answered, this stage is
   *  silently skipped. */
  profileQuestion?: ProfileQuestionKind;
  /** Chapter id for analytics / display. */
  chapterId: string;
}

// Chapter 0 modules that ASK a profile question on Continue. If skipped,
// the Pearl that sits after the same module surfaces the question again.
// Keys here mirror the SOURCE module (where the question is first asked),
// not the BACKSTOP target. See InModuleProfileQuestion.tsx +
// PROFILE_QUESTION_BACKSTOPS in DuoLearnScreen.tsx.
const PROFILE_QUESTION_BY_SOURCE_MODULE: Record<string, ProfileQuestionKind> = {
  'mod-0-1': 'knowledgeLevel',
  'mod-0-4': 'learningTime',
  'mod-0-5': 'dailyGoal',
};

let cachedConfig: Map<string, PearlContent> | null = null;

/**
 * Build the moduleId → PearlContent map once on first access. We walk every
 * chapter and pair each playable module with the next, skipping coming-soon
 * modules. Skipping the LAST module per chapter is intentional — chapter
 * transitions get their own UI (chapter unlock celebration), not a Pearl.
 */
function buildConfig(): Map<string, PearlContent> {
  if (cachedConfig) return cachedConfig;
  const map = new Map<string, PearlContent>();

  for (const chapter of ALL_CHAPTERS) {
    const playable = chapter.modules.filter((m) => !m.comingSoon);
    for (let i = 0; i < playable.length - 1; i++) {
      const current = playable[i];
      const next = playable[i + 1];
      const gameKey = current.interModuleGame;
      // Need a game to render a Pearl — without one there's nothing to play,
      // and we don't want an empty intermezzo node on the path.
      if (!gameKey) continue;

      map.set(current.id, {
        afterModuleId: current.id,
        nextModuleId: next.id,
        gameKey,
        profileQuestion: PROFILE_QUESTION_BY_SOURCE_MODULE[current.id],
        chapterId: chapter.id,
      });
    }
  }

  cachedConfig = map;
  return map;
}

/** Returns the Pearl content that sits AFTER the given moduleId, or null
 *  if there is no Pearl (last module in chapter, or no interModuleGame). */
export function pearlConfigFor(moduleId: string): PearlContent | null {
  return buildConfig().get(moduleId) ?? null;
}

/** Stable id used by usePearlsStore to track opened/completed status. */
export function pearlIdFor(pearl: PearlContent): string {
  return `pearl:${pearl.afterModuleId}`;
}
