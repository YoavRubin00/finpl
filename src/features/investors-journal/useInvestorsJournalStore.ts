import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { fetchJournalEventsApi } from '../../db/sync/syncInvestorsJournal';
import { getIsraelDateISO, getIsraelWeekAnchorISO } from '../../utils/israelTime';
import type { JournalEvent } from './journalTypes';

/** Reward magnitudes (Duo's tuning, pending Moni/Yam sign-off): participation
 *  pays a little XP once per event; a CORRECT forecast pays coins, capped per
 *  week so guessing never becomes a coin machine. */
const VOTE_XP = 5;
const CORRECT_COINS = 25;
const WEEKLY_REWARD_CAP = 3;

interface InvestorsJournalState {
  /** month (YYYY-MM) → events cache; survives offline. */
  eventsByMonth: Record<string, JournalEvent[]>;
  lastFetchAt: Record<string, string>;
  /** eventId → the option the user forecast (0/1). */
  votedEvents: Record<string, 0 | 1>;
  /** events whose vote-XP was already granted. */
  xpGranted: string[];
  /** events whose correct-outcome coins were already claimed. */
  rewarded: string[];
  rewardWeekKey: string | null;
  rewardsThisWeek: number;

  getMonthEvents: (month: string) => JournalEvent[];
  refresh: (month: string) => Promise<void>;
  recordVote: (eventId: string, index: 0 | 1) => void;
  /** Grant the correct-forecast coins once outcome is known. Returns coins
   *  granted (0 when not eligible / already claimed / weekly cap hit). */
  claimOutcomeReward: (event: JournalEvent) => number;
}

export function currentJournalMonth(): string {
  return getIsraelDateISO().slice(0, 7);
}

export const useInvestorsJournalStore = create<InvestorsJournalState>()(
  persist(
    (set, get) => ({
      eventsByMonth: {},
      lastFetchAt: {},
      votedEvents: {},
      xpGranted: [],
      rewarded: [],
      rewardWeekKey: null,
      rewardsThisWeek: 0,

      getMonthEvents: (month) => get().eventsByMonth[month] ?? [],

      refresh: async (month) => {
        try {
          const events = await fetchJournalEventsApi(month);
          set((state) => ({
            eventsByMonth: { ...state.eventsByMonth, [month]: events },
            lastFetchAt: { ...state.lastFetchAt, [month]: new Date().toISOString() },
          }));
        } catch {
          /* offline — keep the cached month, honest empty state otherwise */
        }
      },

      recordVote: (eventId, index) => {
        if (get().votedEvents[eventId] !== undefined) return;
        set((state) => ({ votedEvents: { ...state.votedEvents, [eventId]: index } }));
        if (!get().xpGranted.includes(eventId)) {
          set((state) => ({ xpGranted: [...state.xpGranted, eventId] }));
          try {
            const economyMod = require('../economy/useEconomyUIStore');
            economyMod.useEconomyUIStore.getState().addXP(VOTE_XP, 'challenge_complete');
          } catch { /* economy store unavailable — skip */ }
        }
      },

      claimOutcomeReward: (event) => {
        const state = get();
        if (event.outcome === null) return 0;
        const voted = state.votedEvents[event.id];
        if (voted === undefined || voted !== event.outcome) return 0;
        if (state.rewarded.includes(event.id)) return 0;

        // Weekly cap — resets on the Israel week anchor (Sunday).
        const weekKey = getIsraelWeekAnchorISO();
        const sameWeek = state.rewardWeekKey === weekKey;
        const used = sameWeek ? state.rewardsThisWeek : 0;
        if (used >= WEEKLY_REWARD_CAP) return 0;

        set({
          rewarded: [...state.rewarded, event.id],
          rewardWeekKey: weekKey,
          rewardsThisWeek: used + 1,
        });
        try {
          const economyMod = require('../economy/useEconomyUIStore');
          economyMod.useEconomyUIStore.getState().addCoins(CORRECT_COINS);
        } catch { /* economy store unavailable — skip */ }
        return CORRECT_COINS;
      },
    }),
    {
      name: 'investors-journal-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        eventsByMonth: state.eventsByMonth,
        lastFetchAt: state.lastFetchAt,
        votedEvents: state.votedEvents,
        xpGranted: state.xpGranted,
        rewarded: state.rewarded,
        rewardWeekKey: state.rewardWeekKey,
        rewardsThisWeek: state.rewardsThisWeek,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.eventsByMonth === null || typeof state.eventsByMonth !== 'object' || Array.isArray(state.eventsByMonth)) state.eventsByMonth = {};
        if (state.votedEvents === null || typeof state.votedEvents !== 'object' || Array.isArray(state.votedEvents)) state.votedEvents = {};
        if (!Array.isArray(state.xpGranted)) state.xpGranted = [];
        if (!Array.isArray(state.rewarded)) state.rewarded = [];
        if (typeof state.rewardsThisWeek !== 'number') state.rewardsThisWeek = 0;
      },
    },
  ),
);
