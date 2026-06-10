import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import { track } from '../../lib/analytics/events';
import type { Topic, TopicProgressEntry, ModuleTopicSummary } from './types';
import { chestThresholdFor } from './types';

/** Derive the chapter id from a module id (`mod-3-15` → `chapter-3`). The
 *  Module type doesn't carry its chapter, and the topic-tree layer has no
 *  route param to read it from, so we parse the canonical id format. */
function chapterIdFromModuleId(moduleId: string): string {
  const m = /^mod-(\d+)-/.exec(moduleId);
  return m ? `chapter-${m[1]}` : '';
}

interface TopicProgressState {
  /** Persisted: topicId → completion meta. A topic that's not in the map
   *  is unvisited; presence = done. */
  completed: Record<string, TopicProgressEntry>;
  /** Per-module flag — once a module crosses the 70% gate it stays "done"
   *  even if a topic flips back to incomplete (it won't, but defensive).
   *  Keyed by moduleId. */
  modulesPastThreshold: Record<string, { firstCrossedAt: string }>;
  /** R6 Epic 5: parallel flag for the 100% master chest. Stamped the
   *  first time pct === 100 so the master chest fires exactly once. */
  modulesFullyComplete: Record<string, { firstCrossedAt: string }>;
  /** R6 Epic 7-C1: cross-module daily chest streak. Bumped each time
   *  the user opens a chest within ~48h of the previous one; resets
   *  otherwise. Drives a coin multiplier (1.0 → 1.5 → 2.0 → 2.5). */
  chestStreak: number;
  lastChestAtMs: number;

  markTopicCompleted: (topic: Topic) => void;
  isTopicCompleted: (topicId: string) => boolean;
  summaryForModule: (moduleId: string, topics: Topic[]) => ModuleTopicSummary;
  /** Record a chest open NOW. Bumps the streak (or resets it if the
   *  last open was > 48h ago) and returns the resulting coin
   *  multiplier the caller should apply to the base reward. */
  recordChestOpen: () => number;
  resetForModule: (moduleId: string) => void;
  reset: () => void;
}

function nowIso(): string {
  return new Date().toISOString();
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Allow up to 48h between opens before the streak resets — keeps the
 *  user from losing a 3-day streak to a single timezone-drift edge case
 *  or a "I went to bed at midnight" miss. */
const STREAK_WINDOW_MS = 2 * DAY_MS;

/** Maps streak length → coin multiplier. Capped at ×2.5 so the curve
 *  doesn't escalate into exploit territory (Audrey guardrail). */
function multiplierForStreak(streak: number): number {
  if (streak >= 4) return 2.5;
  if (streak === 3) return 2;
  if (streak === 2) return 1.5;
  return 1;
}

export const useTopicProgressStore = create<TopicProgressState>()(
  persist(
    (set, get) => ({
      completed: {},
      modulesPastThreshold: {},
      modulesFullyComplete: {},
      chestStreak: 0,
      lastChestAtMs: 0,

      markTopicCompleted: (topic) => {
        const state = get();
        if (state.completed[topic.id]) return;
        const completed = { ...state.completed, [topic.id]: { completedAt: nowIso() } };
        set({ completed });
        // Per-chip analytics. The topic-tree method emitted no events before
        // this — every chip completion was invisible to PostHog. Non-fatal:
        // analytics must never block a completion write.
        try {
          track({
            name: 'topic_completed',
            props: {
              module_id: topic.moduleId,
              topic_id: topic.id,
              topic_kind: topic.kind,
              chapter_id: chapterIdFromModuleId(topic.moduleId),
            },
          });
        } catch { /* non-fatal */ }
      },

      isTopicCompleted: (topicId) => Boolean(get().completed[topicId]),

      summaryForModule: (moduleId, topics) => {
        const state = get();
        const total = topics.length;
        const completedCount = topics.filter((t) => state.completed[t.id]).length;
        const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);
        // R8 T3.1 — first-chest gate uses per-module threshold (mod-0-1
        // and mod-0-2 fire at 50% so the user gets their first dopamine
        // hit earlier in onboarding). Default = canonical 0.7.
        const moduleThreshold = chestThresholdFor(moduleId);
        const isModuleDone =
          total > 0 && completedCount / total >= moduleThreshold;

        // Stamp the "first crossed" flips lazily on read — cheaper than wiring
        // a derived effect in every consumer, idempotent because we check
        // before writing. Persisted so analytics can backfill if the chest
        // drop side-effect is interrupted.
        if (isModuleDone && !state.modulesPastThreshold[moduleId]) {
          set({
            modulesPastThreshold: {
              ...state.modulesPastThreshold,
              [moduleId]: { firstCrossedAt: nowIso() },
            },
          });
        }
        // R6 Epic 5: same pattern for the 100% master chest gate.
        if (
          total > 0 &&
          completedCount === total &&
          !state.modulesFullyComplete[moduleId]
        ) {
          set({
            modulesFullyComplete: {
              ...state.modulesFullyComplete,
              [moduleId]: { firstCrossedAt: nowIso() },
            },
          });
        }

        // Canonical "next topic" = first uncompleted in defaultOrder.
        const sorted = [...topics].sort((a, b) => a.defaultOrder - b.defaultOrder);
        const nextTopic = sorted.find((t) => !state.completed[t.id]) ?? null;

        return { completed: completedCount, total, pct, isModuleDone, nextTopic };
      },

      recordChestOpen: () => {
        const state = get();
        const now = Date.now();
        const within = state.lastChestAtMs > 0 && now - state.lastChestAtMs < STREAK_WINDOW_MS;
        const next = within ? state.chestStreak + 1 : 1;
        set({ chestStreak: next, lastChestAtMs: now });
        return multiplierForStreak(next);
      },

      /** Clear every completed topic + threshold flag for a single
       *  module. Used by R5 to wipe pre-R5 stale state for mod-1-1.
       *  Safe to call repeatedly — leaves other modules untouched. */
      resetForModule: (moduleId) => {
        const state = get();
        const completed = { ...state.completed };
        Object.keys(completed).forEach((k) => {
          if (k.startsWith(`${moduleId}:`)) delete completed[k];
        });
        const modulesPastThreshold = { ...state.modulesPastThreshold };
        delete modulesPastThreshold[moduleId];
        const modulesFullyComplete = { ...state.modulesFullyComplete };
        delete modulesFullyComplete[moduleId];
        set({ completed, modulesPastThreshold, modulesFullyComplete });
      },

      reset: () =>
        set({
          completed: {},
          modulesPastThreshold: {},
          modulesFullyComplete: {},
          chestStreak: 0,
          lastChestAtMs: 0,
        }),
    }),
    {
      name: 'topic-progress-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        completed: state.completed,
        modulesPastThreshold: state.modulesPastThreshold,
        modulesFullyComplete: state.modulesFullyComplete,
        chestStreak: state.chestStreak,
        lastChestAtMs: state.lastChestAtMs,
      }),
    }
  )
);

registerLocalStore('topic-progress-store', useTopicProgressStore, 'topic-progress-store');
