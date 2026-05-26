import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';

export const MAX_HEARTS = 5;
const HEART_REFILL_MS = 5 * 60 * 60 * 1000; // 5 hours per heart

const MAX_PRACTICE_REFILLS_PER_DAY = 2;

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

  // Practice-to-Refill (US-006): complete old lesson → +1 heart, max 2/day
  practiceRefillsToday: number;
  practiceRefillDate: string | null;
  pendingPracticeForHeart: boolean;
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

  reset: () => void;
}

const initialState: HeartsState = {
  hearts: MAX_HEARTS,
  lastHeartLostAt: null,
  sessionHeartsLost: 0,
  practiceRefillsToday: 0,
  practiceRefillDate: null,
  pendingPracticeForHeart: false,
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
        set({
          hearts: currentHearts + 1,
          lastHeartLostAt: currentHearts + 1 >= MAX_HEARTS ? null : state.lastHeartLostAt,
          practiceRefillsToday: count + 1,
          practiceRefillDate: today,
          pendingPracticeForHeart: false,
        });
        return true;
      },

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
        // sessionHeartsLost intentionally NOT persisted (cold-start reset)
        // pendingPracticeForHeart intentionally NOT persisted (transient flag)
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Clamp legacy hearts values from previous builds
        if (typeof state.hearts === 'number' && state.hearts > MAX_HEARTS) {
          state.hearts = MAX_HEARTS;
        }
      },
    },
  ),
);

registerLocalStore('hearts-storage-v1', useHeartsStore, 'hearts-storage-v1');
