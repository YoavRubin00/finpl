import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';

// Energy units (formerly "hearts"). The store file keeps the `hearts`/`useHeart`
// names in v1 to avoid churning ~6 call-sites; the full rename to
// useEnergyStore happens in phase 2 (see plan E). Semantically these ARE the
// purple energy units shown in the תחנת הכוח / power-station component.
export const MAX_HEARTS = 20; // MAX energy units (was 5)
/** Alias for new energy-aware code. Same value as MAX_HEARTS. */
export const MAX_ENERGY = MAX_HEARTS;
/** Passive regen interval: one energy unit every 15 minutes (full 0→20 in 5h). */
export const ENERGY_REGEN_MS = 15 * 60 * 1000;
const HEART_REFILL_MS = 15 * 60 * 1000; // 15 minutes per energy unit (was 5h) → full 0→20 in 5h

const MAX_PRACTICE_REFILLS_PER_DAY = 2; // ×PRACTICE_ENERGY_GRANT = +10/day
const PRACTICE_ENERGY_GRANT = 5; // energy granted per practice/replay completion (was +1)

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function calcHeartRefills(lastLostAt: string | null, currentHearts: number): number {
  if (!lastLostAt || currentHearts >= MAX_HEARTS) return 0;
  const elapsed = Math.max(0, Date.now() - new Date(lastLostAt).getTime());
  const refills = Math.floor(elapsed / HEART_REFILL_MS);
  return Math.min(refills, MAX_HEARTS - currentHearts);
}

interface HeartsState {
  hearts: number;
  lastHeartLostAt: string | null;
  // Non-persisted: resets on cold-start, used by upgrade_trigger_timing bandit experiment
  sessionHeartsLost: number;

  // Non-persisted combo streak across ALL correct answers in a lesson
  // (quizzes + interactive recall + simulators). Every 4-in-a-row grants energy.
  comboStreak: number;

  // Non-persisted: drives a GLOBAL out-of-energy modal for depletion OUTSIDE a
  // lesson (financial tools, AI chat). In-lesson keeps using its local modal.
  depletedPromptVisible: boolean;

  // Practice-to-Refill (US-006): complete old lesson → +PRACTICE_ENERGY_GRANT, max 2/day
  practiceRefillsToday: number;
  practiceRefillDate: string | null;
  pendingPracticeForHeart: boolean;

  // Power-station: per-source daily energy grants, each with its own daily cap.
  // Keyed by source ('quest' | 'daily-task' | 'station-game' | 'ad' | 'combo' …).
  // Value = energy granted from that source TODAY (reset on date change).
  energyGrantsBySource: Record<string, { date: string; energy: number }>;
}

interface HeartsActions {
  // Selectors
  getHearts: () => number;
  hasHearts: () => boolean;

  // Actions
  useHeart: (isPro: boolean) => boolean;
  refillHearts: () => void;
  restoreAllHearts: () => void;
  grantPracticeHeart: () => boolean;
  startPracticeForHeart: () => boolean;
  clearPracticeFlag: () => void;

  /**
   * Add energy from a power-station source, respecting an optional per-source
   * daily cap. Settles passive regen first, clamps to MAX_ENERGY. Returns the
   * amount actually granted (0 if at max or daily cap reached). Pass no cap for
   * uncapped sources (e.g. a one-off purchase).
   */
  grantEnergy: (amount: number, source: string, dailyCap?: number) => number;

  /**
   * Register one correct answer toward the cross-lesson combo (quizzes +
   * interactive recall + simulators all call this). Every 4-in-a-row grants
   * +1 energy (capped 6/day). Returns the energy granted on this call (0 if no
   * milestone hit or on replay). Pass isReplay to skip counting practice runs.
   */
  registerComboCorrect: (isReplay?: boolean) => number;
  /** Reset the combo streak (call on any wrong answer / sim failure). */
  resetCombo: () => void;

  /** Show / hide the GLOBAL out-of-energy modal (non-lesson depletion). */
  flagDepleted: () => void;
  clearDepleted: () => void;

  reset: () => void;
}

const initialState: HeartsState = {
  hearts: MAX_HEARTS,
  lastHeartLostAt: null,
  sessionHeartsLost: 0,
  comboStreak: 0,
  depletedPromptVisible: false,
  practiceRefillsToday: 0,
  practiceRefillDate: null,
  pendingPracticeForHeart: false,
  energyGrantsBySource: {},
};

export const useHeartsStore = create<HeartsState & HeartsActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      getHearts: (): number => {
        const state = get();
        const refills = calcHeartRefills(state.lastHeartLostAt, state.hearts);
        if (refills > 0) {
          return Math.min(state.hearts + refills, MAX_HEARTS);
        }
        return state.hearts;
      },

      hasHearts: (): boolean => {
        return get().getHearts() > 0;
      },

      useHeart: (isPro: boolean): boolean => {
        if (isPro) return true;
        const state = get();
        state.refillHearts();
        const current = get().hearts;
        if (current <= 0) return false;
        set((s) => ({
          hearts: current - 1,
          lastHeartLostAt: new Date().toISOString(),
          sessionHeartsLost: s.sessionHeartsLost + 1,
        }));
        return true;
      },

      refillHearts: () => {
        const state = get();
        const refills = calcHeartRefills(state.lastHeartLostAt, state.hearts);
        if (refills > 0) {
          set({ hearts: Math.min(state.hearts + refills, MAX_HEARTS) });
        }
      },

      restoreAllHearts: () => {
        set({ hearts: MAX_HEARTS, lastHeartLostAt: null });
      },

      startPracticeForHeart: (): boolean => {
        const today = todayISO();
        const { practiceRefillDate, practiceRefillsToday } = get();
        const count = practiceRefillDate === today ? practiceRefillsToday : 0;
        if (count >= MAX_PRACTICE_REFILLS_PER_DAY) return false;
        set({ pendingPracticeForHeart: true });
        return true;
      },

      grantPracticeHeart: (): boolean => {
        const today = todayISO();
        const state = get();
        if (!state.pendingPracticeForHeart) return false;
        const count = state.practiceRefillDate === today ? state.practiceRefillsToday : 0;
        if (count >= MAX_PRACTICE_REFILLS_PER_DAY) {
          set({ pendingPracticeForHeart: false });
          return false;
        }
        const currentHearts = state.hearts;
        if (currentHearts >= MAX_HEARTS) {
          set({ pendingPracticeForHeart: false });
          return false;
        }
        const nextHearts = Math.min(currentHearts + PRACTICE_ENERGY_GRANT, MAX_HEARTS);
        set({
          hearts: nextHearts,
          lastHeartLostAt: nextHearts >= MAX_HEARTS ? null : state.lastHeartLostAt,
          practiceRefillsToday: count + 1,
          practiceRefillDate: today,
          pendingPracticeForHeart: false,
        });
        return true;
      },

      grantEnergy: (amount: number, source: string, dailyCap?: number): number => {
        if (amount <= 0) return 0;
        const today = todayISO();
        // Settle passive regen first so we grant on top of the true current value.
        get().refillHearts();
        const current = get().hearts;
        if (current >= MAX_HEARTS) return 0;

        let granted = Math.min(amount, MAX_HEARTS - current);

        if (dailyCap != null) {
          const rec = get().energyGrantsBySource[source];
          const usedToday = rec && rec.date === today ? rec.energy : 0;
          granted = Math.min(granted, Math.max(0, dailyCap - usedToday));
          if (granted <= 0) return 0;
          const next = Math.min(current + granted, MAX_HEARTS);
          set((s) => ({
            hearts: next,
            lastHeartLostAt: next >= MAX_HEARTS ? null : s.lastHeartLostAt,
            energyGrantsBySource: {
              ...s.energyGrantsBySource,
              [source]: { date: today, energy: usedToday + granted },
            },
          }));
        } else {
          if (granted <= 0) return 0;
          const next = Math.min(current + granted, MAX_HEARTS);
          set((s) => ({
            hearts: next,
            lastHeartLostAt: next >= MAX_HEARTS ? null : s.lastHeartLostAt,
          }));
        }
        return granted;
      },

      registerComboCorrect: (isReplay?: boolean): number => {
        if (isReplay) return 0;
        const next = get().comboStreak + 1;
        set({ comboStreak: next });
        // Every 4 correct-in-a-row across the whole lesson → +1 energy (capped 6/day).
        if (next % 4 === 0) {
          return get().grantEnergy(1, 'combo', 6);
        }
        return 0;
      },

      resetCombo: () => set({ comboStreak: 0 }),

      flagDepleted: () => set({ depletedPromptVisible: true }),
      clearDepleted: () => set({ depletedPromptVisible: false }),

      clearPracticeFlag: () => {
        set({ pendingPracticeForHeart: false });
      },

      reset: () => set(initialState),
    }),
    {
      name: 'hearts-storage-v1',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        hearts: state.hearts,
        lastHeartLostAt: state.lastHeartLostAt,
        practiceRefillsToday: state.practiceRefillsToday,
        practiceRefillDate: state.practiceRefillDate,
        energyGrantsBySource: state.energyGrantsBySource,
        // sessionHeartsLost intentionally NOT persisted (cold-start reset)
        // pendingPracticeForHeart intentionally NOT persisted (transient flag)
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Legacy builds stored hearts on a 0–5 scale. The energy rescale moved
        // MAX to 20; a persisted 0–5 value is still valid (just "low"), but a
        // value above the new MAX (shouldn't happen) is clamped. We deliberately
        // do NOT upscale old 0–5 values — passive regen (15min/unit) refills
        // them to 20 within hours, so users heal automatically.
        if (typeof state.hearts === 'number' && state.hearts > MAX_HEARTS) {
          state.hearts = MAX_HEARTS;
        }
        if (!state.energyGrantsBySource || typeof state.energyGrantsBySource !== 'object') {
          state.energyGrantsBySource = {};
        }
      },
    },
  ),
);

registerLocalStore('hearts-storage-v1', useHeartsStore, 'hearts-storage-v1');
