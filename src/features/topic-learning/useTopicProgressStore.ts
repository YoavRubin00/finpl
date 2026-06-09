import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import type { Topic, TopicProgressEntry, ModuleTopicSummary } from './types';
import { TOPIC_COMPLETION_THRESHOLD } from './types';

interface TopicProgressState {
  /** Persisted: topicId → completion meta. A topic that's not in the map
   *  is unvisited; presence = done. */
  completed: Record<string, TopicProgressEntry>;
  /** Per-module flag — once a module crosses the 70% gate it stays "done"
   *  even if a topic flips back to incomplete (it won't, but defensive).
   *  Keyed by moduleId. */
  modulesPastThreshold: Record<string, { firstCrossedAt: string }>;

  markTopicCompleted: (topic: Topic) => void;
  isTopicCompleted: (topicId: string) => boolean;
  summaryForModule: (moduleId: string, topics: Topic[]) => ModuleTopicSummary;
  resetForModule: (moduleId: string) => void;
  reset: () => void;
}

function nowIso(): string {
  return new Date().toISOString();
}

export const useTopicProgressStore = create<TopicProgressState>()(
  persist(
    (set, get) => ({
      completed: {},
      modulesPastThreshold: {},

      markTopicCompleted: (topic) => {
        const state = get();
        if (state.completed[topic.id]) return;
        const completed = { ...state.completed, [topic.id]: { completedAt: nowIso() } };
        set({ completed });
        // Threshold flip is computed by the caller (it has the topic list);
        // we just expose summaryForModule. The caller decides what to do
        // (e.g. fire chest drop, capture event). We record the flip here so
        // a future read can tell whether the user already crossed the gate
        // even before the chest drop is consumed.
        // NOTE: do NOT call summaryForModule from inside set — it depends
        // on the just-updated `completed` map, so let the caller read it
        // after this returns.
      },

      isTopicCompleted: (topicId) => Boolean(get().completed[topicId]),

      summaryForModule: (moduleId, topics) => {
        const state = get();
        const total = topics.length;
        const completedCount = topics.filter((t) => state.completed[t.id]).length;
        const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);
        const isModuleDone =
          total > 0 && completedCount / total >= TOPIC_COMPLETION_THRESHOLD;

        // Stamp the "first crossed" flip lazily on read — cheaper than wiring
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

        // Canonical "next topic" = first uncompleted in defaultOrder.
        const sorted = [...topics].sort((a, b) => a.defaultOrder - b.defaultOrder);
        const nextTopic = sorted.find((t) => !state.completed[t.id]) ?? null;

        return { completed: completedCount, total, pct, isModuleDone, nextTopic };
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
        set({ completed, modulesPastThreshold });
      },

      reset: () => set({ completed: {}, modulesPastThreshold: {} }),
    }),
    {
      name: 'topic-progress-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        completed: state.completed,
        modulesPastThreshold: state.modulesPastThreshold,
      }),
    }
  )
);

registerLocalStore('topic-progress-store', useTopicProgressStore, 'topic-progress-store');
