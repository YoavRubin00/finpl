/**
 * Knowledge Tree ("עץ הידע") — a cumulative, cyclical retention mechanic.
 *
 * The tree grows ONE stage per Israeli calendar day on which the user performs
 * a value action (lesson/topic, tool, daily/news challenge, pearl). Growth is
 * CUMULATIVE — missing a day never loses progress, it just pauses. Every
 * DAYS_PER_TREE watering-days the tree reaches full bloom and a fresh sapling
 * starts (the "forest" / treesCompleted counter).
 *
 * `waterToday()` is the single growth trigger, fired from
 * `markDailyActivityCompleted()` (covers pearl/tool/challenge/lesson) and from
 * topic completion (`useTopicProgressStore.markTopicCompleted`). It is
 * idempotent per IL day, so calling it on every value action is safe.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';

/** Watering days needed to grow one full tree (matches the 8 growth frames).
 *  After this many value-action days the tree is full; the next day starts a
 *  fresh sapling. */
export const DAYS_PER_TREE = 8;

const IL_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** YYYY-MM-DD anchored to Asia/Jerusalem — the same day boundary the streak
 *  helpers use. Defined locally (not imported from useStreak) so this store has
 *  no dependency on useStreak, which imports THIS store to water on activity. */
function todayIsraelDate(): string {
  return IL_DATE_FMT.format(new Date());
}

interface KnowledgeTreeState {
  /** Cumulative count of distinct IL days with ≥1 value action. Never decreases. */
  wateredDays: number;
  /** IL date (YYYY-MM-DD) of the last watering, or null if never watered. */
  lastWateredDate: string | null;
  /** Water the tree for today. Idempotent per Israeli calendar day. */
  waterToday: () => void;
}

export const useKnowledgeTreeStore = create<KnowledgeTreeState>()(
  persist(
    (set, get) => ({
      wateredDays: 0,
      lastWateredDate: null,
      waterToday: () => {
        const today = todayIsraelDate();
        if (get().lastWateredDate === today) return; // already watered today
        set((s) => ({ wateredDays: s.wateredDays + 1, lastWateredDate: today }));
      },
    }),
    {
      name: 'knowledge-tree',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({ wateredDays: s.wateredDays, lastWateredDate: s.lastWateredDate }),
    },
  ),
);

/** Derived, render-ready view of the tree for a cumulative watered-day count. */
export interface KnowledgeTreeView {
  /** Stage to render, 1..8 (1 = seed, 8 = full bloom). 0 watered days → seed. */
  displayStage: number;
  /** Whether the current tree is at full bloom this cycle. */
  isFull: boolean;
  /** Completed full trees so far (the "forest" counter). */
  treesCompleted: number;
  /** Watering days left until the current tree completes. 0 when full. */
  daysToNextTree: number;
}

export function knowledgeTreeView(wateredDays: number): KnowledgeTreeView {
  if (wateredDays <= 0) {
    return { displayStage: 1, isFull: false, treesCompleted: 0, daysToNextTree: DAYS_PER_TREE };
  }
  // stageInCycle 1..8: day 8 = full tree (stage 8), day 9 = new sapling (stage 1).
  const stageInCycle = ((wateredDays - 1) % DAYS_PER_TREE) + 1;
  return {
    displayStage: stageInCycle,
    isFull: stageInCycle === DAYS_PER_TREE,
    treesCompleted: Math.floor(wateredDays / DAYS_PER_TREE),
    daysToNextTree: DAYS_PER_TREE - stageInCycle,
  };
}

/** True if the tree was already watered today (Israeli day). */
export function isWateredToday(lastWateredDate: string | null): boolean {
  return lastWateredDate === todayIsraelDate();
}