import { PRO_LOCKED_SIMS } from "../../constants/proGates";
import { useChapterStore } from "../chapter-1-content/useChapterStore";
import { useSubscriptionStore } from "./useSubscriptionStore";
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
}

export function isModuleAccessible(moduleId: string, chapterId: string): boolean {
  const isPro = useSubscriptionStore.getState().isPro();
  if (isPro) return true;
  const progress = useChapterStore.getState().progress;
  const chapterIdx = ALL_CHAPTERS_ORDERED.findIndex((c) => c.id === chapterId);
  if (chapterIdx < 0) return true;
  for (let ci = 0; ci < chapterIdx; ci++) {
    const prev = ALL_CHAPTERS_ORDERED[ci];
    const prevCompleted = progress[chapterStoreKey(prev.id)]?.completedModules ?? [];
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
  const completed = progress[chapterStoreKey(chapter.id)]?.completedModules ?? [];
  for (let mi = 0; mi < modIdx; mi++) {
    if (chapter.modules[mi].comingSoon) continue;
    if (PRO_LOCKED_SIMS.has(chapter.modules[mi].id)) continue;
    if (!completed.includes(chapter.modules[mi].id)) return false;
  }
  return true;
}

export function nextAccessibleModule(): AccessibleModule | null {
  const progress = useChapterStore.getState().progress;
  for (const ch of ALL_CHAPTERS_ORDERED) {
    const completed = progress[chapterStoreKey(ch.id)]?.completedModules ?? [];
    const nextMod = ch.modules.find(
      (m) => !m.comingSoon && !PRO_LOCKED_SIMS.has(m.id) && !completed.includes(m.id),
    );
    if (nextMod) {
      return {
        moduleId: nextMod.id,
        chapterId: ch.id,
        storeChapterId: chapterStoreKey(ch.id),
        title: nextMod.title,
      };
    }
  }
  return null;
}
