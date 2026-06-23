import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import { israelDayKey } from '../../utils/dateUtils';
import { useDailyChallengesStore } from '../daily-challenges/use-daily-challenges-store';
import { useRetentionStore } from '../retention-loops/useRetentionStore';
import { captureEvent } from '../../lib/posthog';
import { getTodayGames } from './dailyChallengeConfig';
import type { GameKey } from './dailyChallengeConfig';

interface DailyChallengeState {
  chestGrantedDates: string[];
  markChestGranted: (date: string) => void;
  hasChestGrantedToday: () => boolean;
  checkAndGrantChest: () => void;
  reset: () => void;
}

export const useDailyChallengeStore = create<DailyChallengeState>()(
  persist(
    (set, get) => ({
      chestGrantedDates: [],

      markChestGranted: (date: string) => {
        const { chestGrantedDates } = get();
        if (!chestGrantedDates.includes(date)) {
          set({ chestGrantedDates: [...chestGrantedDates, date] });
        }
      },

      hasChestGrantedToday: () => {
        return get().chestGrantedDates.includes(israelDayKey());
      },

      reset: () => set({ chestGrantedDates: [] }),

      checkAndGrantChest: () => {
        const date = israelDayKey();
        if (get().chestGrantedDates.includes(date)) return;

        const games = getTodayGames();
        const completedCount = getTodayCompletedCount(games);
        if (completedCount < 3) return;

        const granted = useRetentionStore.getState().grantChest({
          id: `daily-challenge-${date}`,
          name: 'ארגז האתגר',
          rarity: 'rare',
          unlockTimeMinutes: 120,
        });

        if (granted) {
          get().markChestGranted(date);
          captureEvent('daily_challenge_completed', {
            date,
            games: games.join(','),
          });
        }
      },
    }),
    {
      name: 'daily-challenge-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ chestGrantedDates: state.chestGrantedDates }),
    },
  ),
);

registerLocalStore('daily-challenge-store', useDailyChallengeStore, 'daily-challenge-store');

export function getTodayCompletedCount(games: [GameKey, GameKey, GameKey]): number {
  const s = useDailyChallengesStore.getState();
  return games.filter((g) => getGamePlaysToday(s, g) > 0).length;
}

function getGamePlaysToday(
  s: ReturnType<typeof useDailyChallengesStore.getState>,
  game: GameKey,
): number {
  switch (game) {
    case 'higher-lower': return s.getHigherLowerPlaysToday();
    case 'bullshit-swipe': return s.getBullshitSwipePlaysToday();
    case 'budget-ninja': return s.getBudgetNinjaPlaysToday();
    case 'price-slider': return s.getPriceSliderPlaysToday();
    case 'cashout-rush': return s.getCashoutRushPlaysToday();
    case 'fomo-killer': return s.getFomoKillerPlaysToday();
  }
}
