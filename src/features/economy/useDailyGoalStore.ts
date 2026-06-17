import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import { israelDayKey } from '../../utils/dateUtils';
import { track } from '../../lib/analytics/events';

/**
 * Daily-goal ring ("מטרת היום") — the missing Duolingo daily-XP-goal primitive.
 * Mirrors `xpToday` against an auto-tuning `goalXp`; the ring lives in the
 * learn-screen header + lesson summary. This store is a *reflection* of XP
 * earned today for the goal UI — it is NOT a source of truth for the economy
 * (that stays in useEconomyUIStore / the server). `addXpToday` is fed from
 * `useEconomyUIStore.addXP` via a lazy require so every XP grant tops the ring.
 *
 * Colour note: the ring renders in brand sea-blue / gold (XP), never the
 * reserved energy purple — energy is its own currency (see energyTheme.ts).
 */

export const DEFAULT_GOAL_XP = 50;
const MIN_GOAL_XP = 50;
const MAX_GOAL_XP = 150;
/** Keep at most this many day-totals for the weekly median auto-tune. */
const HISTORY_DAYS = 14;
/** Need at least this many past days before we adjust off the default. */
const MIN_DAYS_FOR_TUNE = 4;

/** Median of the most-recent (up to 7) non-zero day totals, clamped + rounded
 *  to the nearest 10. Falls back to DEFAULT until enough history exists. The
 *  clamp keeps the goal from ever becoming a grind treadmill. */
function autoTuneGoal(history: Record<string, number>): number {
  const totals = Object.keys(history)
    .sort() // YYYY-MM-DD sorts chronologically
    .slice(-7)
    .map((k) => history[k])
    .filter((v) => v > 0);
  if (totals.length < MIN_DAYS_FOR_TUNE) return DEFAULT_GOAL_XP;
  const sorted = [...totals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const rounded = Math.round(median / 10) * 10;
  return Math.max(MIN_GOAL_XP, Math.min(MAX_GOAL_XP, rounded));
}

/** Trim a history map to the most recent HISTORY_DAYS keys. */
function trimHistory(history: Record<string, number>): Record<string, number> {
  const keys = Object.keys(history).sort();
  if (keys.length <= HISTORY_DAYS) return history;
  const keep = keys.slice(-HISTORY_DAYS);
  const next: Record<string, number> = {};
  for (const k of keep) next[k] = history[k];
  return next;
}

interface DailyGoalState {
  /** israelDayKey() the live fields belong to. */
  dayKey: string;
  xpToday: number;
  goalXp: number;
  /** Lessons finished AFTER the goal was already met today ("מצב על"). */
  overachieverLessons: number;
  /** True once xpToday crossed goalXp today (one-shot per day). */
  goalReached: boolean;
  /** Set on the crossing tick; the ring consumes it to fire confetti once. */
  pendingGoalCelebration: boolean;
  /** dayKey -> XP earned that day, bounded to HISTORY_DAYS, for auto-tune. */
  history: Record<string, number>;
  _hydrated: boolean;
}

interface DailyGoalActions {
  /** Roll the live fields to today if the day changed (banks history + tunes). */
  rolloverIfNeeded: () => void;
  /** Feed XP into today's ring. Detects the goal crossing + fires analytics. */
  addXpToday: (amount: number) => void;
  /** Call at lesson completion: if the goal is already met, count an
   *  overachiever lesson (the caller grants the small "מצב על" coin bonus). */
  noteLessonComplete: () => void;
  /** 0..N progress ratio (can exceed 1 in "מצב על"). */
  getProgress: () => number;
  clearGoalCelebration: () => void;
  reset: () => void;
}

const initialState: DailyGoalState = {
  dayKey: israelDayKey(),
  xpToday: 0,
  goalXp: DEFAULT_GOAL_XP,
  overachieverLessons: 0,
  goalReached: false,
  pendingGoalCelebration: false,
  history: {},
  _hydrated: false,
};

export const useDailyGoalStore = create<DailyGoalState & DailyGoalActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      rolloverIfNeeded: () => {
        const today = israelDayKey();
        const s = get();
        if (s.dayKey === today) return;
        // Bank the day that just ended, then auto-tune off the trimmed history.
        const banked = trimHistory({ ...s.history, [s.dayKey]: s.xpToday });
        set({
          dayKey: today,
          xpToday: 0,
          overachieverLessons: 0,
          goalReached: false,
          pendingGoalCelebration: false,
          history: banked,
          goalXp: autoTuneGoal(banked),
        });
      },

      addXpToday: (amount: number) => {
        if (amount <= 0) return;
        get().rolloverIfNeeded();
        const s = get();
        const newXp = s.xpToday + amount;
        const justReached = !s.goalReached && newXp >= s.goalXp;
        set({
          xpToday: newXp,
          history: { ...s.history, [s.dayKey]: newXp },
          goalReached: s.goalReached || justReached,
          pendingGoalCelebration: s.pendingGoalCelebration || justReached,
        });
        if (justReached) {
          try {
            track({
              name: 'daily_goal_reached',
              props: {
                goal_xp: s.goalXp,
                xp_today: newXp,
                overachiever_lessons: s.overachieverLessons,
              },
            });
          } catch {
            /* analytics is best-effort */
          }
        }
      },

      noteLessonComplete: () => {
        get().rolloverIfNeeded();
        if (get().goalReached) {
          set((st) => ({ overachieverLessons: st.overachieverLessons + 1 }));
        }
      },

      getProgress: () => {
        const s = get();
        if (s.goalXp <= 0) return 0;
        return s.xpToday / s.goalXp;
      },

      clearGoalCelebration: () => set({ pendingGoalCelebration: false }),

      reset: () => set({ ...initialState, dayKey: israelDayKey(), _hydrated: true }),
    }),
    {
      name: 'daily-goal-store-v1',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        dayKey: state.dayKey,
        xpToday: state.xpToday,
        goalXp: state.goalXp,
        overachieverLessons: state.overachieverLessons,
        goalReached: state.goalReached,
        history: state.history,
        // pendingGoalCelebration is transient — never persisted.
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hydrated = true;
          state.pendingGoalCelebration = false;
        }
        // Roll to today on cold-start so a stale yesterday doesn't show.
        useDailyGoalStore.getState().rolloverIfNeeded();
      },
    }
  )
);

registerLocalStore('daily-goal-store-v1', useDailyGoalStore, 'daily-goal-store-v1');
