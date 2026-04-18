import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { pickMissionForDate, type MarketMission, type MarketMissionKind } from './marketMissionsData';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

interface MarketMissionState {
  /** Active mission for today (rotated daily) */
  todaysMission: MarketMission | null;
  /** Date this mission was generated for */
  missionDate: string | null;
  /** Whether today's mission is completed */
  completedToday: boolean;
  /** Whether the user already saw the praise overlay (avoid re-celebrating on re-render) */
  praiseShownToday: boolean;

  refreshDaily: () => void;
  markCompletedIfMatches: (kind: MarketMissionKind) => boolean;
  acknowledgePraise: () => void;
}

export const useMarketMissionStore = create<MarketMissionState>()(
  persist(
    (set, get) => ({
      todaysMission: null,
      missionDate: null,
      completedToday: false,
      praiseShownToday: false,

      refreshDaily: () => {
        const today = todayKey();
        const { missionDate } = get();
        if (missionDate === today && get().todaysMission) return;
        set({
          todaysMission: pickMissionForDate(today),
          missionDate: today,
          completedToday: false,
          praiseShownToday: false,
        });
      },

      // Returns true if this call actually flipped completedToday → true
      markCompletedIfMatches: (kind) => {
        const { todaysMission, completedToday } = get();
        if (!todaysMission || completedToday) return false;
        if (todaysMission.kind !== kind) return false;
        set({ completedToday: true });
        return true;
      },

      acknowledgePraise: () => set({ praiseShownToday: true }),
    }),
    {
      name: 'market-mission-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        todaysMission: state.todaysMission,
        missionDate: state.missionDate,
        completedToday: state.completedToday,
        praiseShownToday: state.praiseShownToday,
      }),
    },
  ),
);
