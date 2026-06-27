import { PRO_LOCKED_SIMS } from "../../constants/proGates";
import type { Module } from "../chapter-1-content/types";
import { lessonRouteFor } from "../topic-learning/topicResolver";
import { getCompletedModulesSync } from "../chapter-1-content/useProgress";
import { queryClient } from "../../lib/queryClient";
import type { SubscriptionState } from "../../lib/api/subscription";
import { subscriptionQueryKey } from "./useSubscription";
import { chapter0Data } from "../chapter-0-content/chapter0Data";
import { chapter1Data } from "../chapter-1-content/chapter1Data";
import { chapter2Data } from "../chapter-2-content/chapter2Data";
import { chapter3Data } from "../chapter-3-content/chapter3Data";
import { chapter4Data } from "../chapter-4-content/chapter4Data";
import { chapter5Data } from "../chapter-5-content/chapter5Data";

const ALL_CHAPTERS_ORDERED = [
  chapter0Data as unknown as typeof chapter1Data,
  chapter1Data,
  chapter2Data,
  chapter3Data,
  chapter4Data,
  chapter5Data,
];

function chapterStoreKey(chapterId: string): string {
  return `ch-${chapterId.split("-")[1]}`;
}

export interface AccessibleModule {
  moduleId: string;
  chapterId: string;
  storeChapterId: string;
  title: string;
  /** The full Module — so callers can route via lessonRouteFor (which needs to
   *  check shouldUseTopicTree) without a second cross-chapter lookup. */
  module: Module;
}

export function isModuleAccessible(moduleId: string, chapterId: string): boolean {
  const sub = queryClient.getQueryData<SubscriptionState | null>(subscriptionQueryKey);
  const isPro = sub?.isPro === true;
  if (isPro) return true;
  const chapterIdx = ALL_CHAPTERS_ORDERED.findIndex((c) => c.id === chapterId);
  if (chapterIdx < 0) return true;
  for (let ci = 0; ci < chapterIdx; ci++) {
    const prev = ALL_CHAPTERS_ORDERED[ci];
    const prevCompleted = getCompletedModulesSync(chapterStoreKey(prev.id));
    if (
      !prev.modules.every(
        (m) => m.comingSoon || PRO_LOCKED_SIMS.has(m.id) || prevCompleted.includes(m.id),
      )
    ) {
      return false;
    }
  }
  const chapter = ALL_CHAPTERS_ORDERED[chapterIdx];
  const modIdx = chapter.modules.findIndex((m) => m.id === moduleId);
  if (modIdx < 0) return true;
  const completed = getCompletedModulesSync(chapterStoreKey(chapter.id));
  for (let mi = 0; mi < modIdx; mi++) {
    if (chapter.modules[mi].comingSoon) continue;
    if (PRO_LOCKED_SIMS.has(chapter.modules[mi].id)) continue;
    if (!completed.includes(chapter.modules[mi].id)) return false;
  }
  return true;
}

/** Deep-link helper: resolve a module by id across ALL chapters and return its
 *  lesson route (topic-tree chip flow when supported, legacy otherwise). For
 *  CTAs that only carry a moduleId string — saved items, tool next-step, trading
 *  hub, premium learning, simulator — so they never drop into the legacy flow
 *  (old chest + no chip persistence). Yoav 2026-06-27. */
export function lessonRouteById(
  moduleId: string,
  chapterId: string,
  opts: { startPhase?: string; replay?: boolean } = {},
): string {
  for (const ch of ALL_CHAPTERS_ORDERED) {
    const m = ch.modules.find((mm) => mm.id === moduleId);
    // Use the FOUND chapter's id, not the caller's — keeps chapterId correct
    // even when the caller only has a loose value (e.g. SavedItem stores a number).
    if (m) return lessonRouteFor(m, ch.id, opts);
  }
  return `/lesson/${moduleId}?chapterId=${chapterId}`;
}

export function nextAccessibleModule(): AccessibleModule | null {
  for (const ch of ALL_CHAPTERS_ORDERED) {
    const completed = getCompletedModulesSync(chapterStoreKey(ch.id));
    const nextMod = ch.modules.find(
      (m) => !m.comingSoon && !PRO_LOCKED_SIMS.has(m.id) && !completed.includes(m.id),
    );
    if (nextMod) {
      return {
        moduleId: nextMod.id,
        chapterId: ch.id,
        storeChapterId: chapterStoreKey(ch.id),
        title: nextMod.title,
        module: nextMod,
      };
    }
  }
  return null;
}
