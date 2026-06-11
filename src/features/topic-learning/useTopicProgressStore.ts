import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import { track } from '../../lib/analytics/events';
import type { Topic, TopicProgressEntry, ModuleTopicSummary, ChestRarity } from './types';
import {
  chestThresholdFor,
  PITY_TIMER_THRESHOLD,
  MYTHIC_DROP_RATE,
  RARE_DROP_RATE,
} from './types';

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
  /** R8 T3.4 — counts how many `common` chests the user has opened
   *  in a row. Resets to 0 the moment a rare or mythic drops. When it
   *  reaches PITY_TIMER_THRESHOLD, the next chest roll is FORCED to
   *  rare. This is Clash Royale's "pity timer" — the math behind
   *  "you can't have 10 bad chests in a row." */
  commonChestStreak: number;

  markTopicCompleted: (topic: Topic, via?: 'chip' | 'continuous') => void;
  isTopicCompleted: (topicId: string) => boolean;
  summaryForModule: (moduleId: string, topics: Topic[]) => ModuleTopicSummary;
  /** Idempotently persist the "first crossed 70%" / "first crossed 100%"
   *  flags. Called from the chest-drop effects in TopicTreeAccordion — NOT
   *  from summaryForModule, which must stay a pure read (stamping there ran
   *  a set() during render → "update during render" warning + re-render
   *  cascade; Yoav 2026-06-11 QA). */
  stampModuleThreshold: (moduleId: string) => void;
  stampModuleFullyComplete: (moduleId: string) => void;
  /** Record a chest open NOW. Bumps the streak (or resets it if the
   *  last open was > 48h ago) AND rolls rarity (with pity timer).
   *  Returns both the streak multiplier and the rolled rarity so the
   *  caller can apply both bonuses to the base reward and pick the
   *  matching modal visuals. */
  recordChestOpen: () => { multiplier: number; rarity: ChestRarity };
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
      commonChestStreak: 0,

      markTopicCompleted: (topic, via) => {
        const state = get();
        if (state.completed[topic.id]) return;
        const completed = { ...state.completed, [topic.id]: { completedAt: nowIso() } };
        set({ completed });
        // Per-chip analytics. The topic-tree method emitted no events before
        // this — every chip completion was invisible to PostHog. Non-fatal:
        // analytics must never block a completion write. `via` discriminates
        // chip-driven completions from continuous-run ones so the funnel
        // can split retention by path.
        try {
          track({
            name: 'topic_completed',
            props: {
              module_id: topic.moduleId,
              topic_id: topic.id,
              topic_kind: topic.kind,
              chapter_id: chapterIdFromModuleId(topic.moduleId),
              via,
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

        // PURE read — no set() here. The "first crossed" flags are stamped by
        // stampModuleThreshold / stampModuleFullyComplete from the accordion's
        // chest effects (see interface docstring).

        // Canonical "next topic" = first uncompleted in defaultOrder.
        const sorted = [...topics].sort((a, b) => a.defaultOrder - b.defaultOrder);
        const nextTopic = sorted.find((t) => !state.completed[t.id]) ?? null;

        return { completed: completedCount, total, pct, isModuleDone, nextTopic };
      },

      stampModuleThreshold: (moduleId) => {
        const state = get();
        if (state.modulesPastThreshold[moduleId]) return;
        set({
          modulesPastThreshold: {
            ...state.modulesPastThreshold,
            [moduleId]: { firstCrossedAt: nowIso() },
          },
        });
      },

      stampModuleFullyComplete: (moduleId) => {
        const state = get();
        if (state.modulesFullyComplete[moduleId]) return;
        set({
          modulesFullyComplete: {
            ...state.modulesFullyComplete,
            [moduleId]: { firstCrossedAt: nowIso() },
          },
        });
      },

      recordChestOpen: () => {
        const state = get();
        const now = Date.now();
        const within = state.lastChestAtMs > 0 && now - state.lastChestAtMs < STREAK_WINDOW_MS;
        const next = within ? state.chestStreak + 1 : 1;
        // R8 T3.4 — roll rarity with pity timer. If the user has hit
        // PITY_TIMER_THRESHOLD commons in a row, force rare on this
        // open and reset the counter. Mythic stays pure-luck (no
        // pity-upgrade path) so it remains genuinely rare.
        let rarity: ChestRarity;
        if (state.commonChestStreak >= PITY_TIMER_THRESHOLD) {
          rarity = 'rare';
        } else {
          const roll = Math.random();
          if (roll < MYTHIC_DROP_RATE) rarity = 'mythic';
          else if (roll < MYTHIC_DROP_RATE + RARE_DROP_RATE) rarity = 'rare';
          else rarity = 'common';
        }
        const nextCommonStreak = rarity === 'common' ? state.commonChestStreak + 1 : 0;
        set({
          chestStreak: next,
          lastChestAtMs: now,
          commonChestStreak: nextCommonStreak,
        });
        return { multiplier: multiplierForStreak(next), rarity };
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
          commonChestStreak: 0,
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
        commonChestStreak: state.commonChestStreak,
      }),
    }
  )
);

registerLocalStore('topic-progress-store', useTopicProgressStore, 'topic-progress-store');
