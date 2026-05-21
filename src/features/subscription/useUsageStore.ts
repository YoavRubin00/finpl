// Local persistent store for daily feature usage counters and UI state
// that previously lived in useSubscriptionStore.
// Subscription tier (isPro) comes from the server via useSubscription() / useIsPro().

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import type { GatedFeature } from './subscriptionConstants';
import { BASIC_LIMITS } from './subscriptionConstants';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface UsageState {
  simulatorUsesToday: number;
  arenaChallengesToday: number;
  chatMessagesToday: number;
  lastUsageResetDate: string | null;

  // Pro welcome gate
  hasSeenProWelcome: boolean;
}

interface UsageActions {
  resetDailyUsageIfNeeded: () => void;
  incrementUsage: (feature: GatedFeature) => void;
  /** Pass isPro from server subscription so the store doesn't need to know about RC */
  canUse: (feature: GatedFeature, isPro: boolean) => boolean;
  markProWelcomeSeen: () => void;
  reset: () => void;
}

const initialState: UsageState = {
  simulatorUsesToday: 0,
  arenaChallengesToday: 0,
  chatMessagesToday: 0,
  lastUsageResetDate: null,
  hasSeenProWelcome: false,
};

export const useUsageStore = create<UsageState & UsageActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      resetDailyUsageIfNeeded: () => {
        const { lastUsageResetDate } = get();
        const today = todayISO();
        if (lastUsageResetDate !== today) {
          set({
            simulatorUsesToday: 0,
            arenaChallengesToday: 0,
            chatMessagesToday: 0,
            lastUsageResetDate: today,
          });
        }
      },

      incrementUsage: (feature: GatedFeature) => {
        const state = get();
        state.resetDailyUsageIfNeeded();
        switch (feature) {
          case 'simulator':
            set((s) => ({ simulatorUsesToday: s.simulatorUsesToday + 1 }));
            break;
          case 'arena':
            set((s) => ({ arenaChallengesToday: s.arenaChallengesToday + 1 }));
            break;
          case 'chat':
            set((s) => ({ chatMessagesToday: s.chatMessagesToday + 1 }));
            break;
          case 'aiInsights':
          case 'saved_items':
            break;
        }
      },

      canUse: (feature: GatedFeature, isPro: boolean): boolean => {
        if (isPro) return true;

        const state = get();
        const today = todayISO();
        if (state.lastUsageResetDate !== today) return true;

        const limit = BASIC_LIMITS[feature];
        if (limit === 0) return false;

        switch (feature) {
          case 'simulator':
            return state.simulatorUsesToday < limit;
          case 'arena':
            return state.arenaChallengesToday < limit;
          case 'chat':
            return state.chatMessagesToday < limit;
          case 'aiInsights':
          case 'saved_items':
            return false;
        }
      },

      markProWelcomeSeen: () => {
        set({ hasSeenProWelcome: true });
      },

      reset: () => set(initialState),
    }),
    {
      name: 'usage-storage-v1',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        simulatorUsesToday: state.simulatorUsesToday,
        arenaChallengesToday: state.arenaChallengesToday,
        chatMessagesToday: state.chatMessagesToday,
        lastUsageResetDate: state.lastUsageResetDate,
        hasSeenProWelcome: state.hasSeenProWelcome,
      }),
    },
  ),
);

registerLocalStore('usage-storage-v1', useUsageStore, 'usage-storage-v1');
