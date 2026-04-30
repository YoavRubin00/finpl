import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import type {
  FantasyTier,
  StockCategoryId,
  DraftPick,
  WeeklyEntry,
  FantasyLeaderboardEntry,
  WeeklyMission,
} from './fantasyTypes';
import {
  TIER_CONFIGS,
  getMockLeaderboard,
  simulateWeeklyReturn,
  getWeeklyMissions,
  getCurrentWeekId,
  DRAFT_STREAK_BONUSES,
} from './fantasyData';

// ---------------------------------------------------------------------------
// State & actions
// ---------------------------------------------------------------------------

interface FantasyStoreState {
  currentEntry: WeeklyEntry | null;
  leaderboard: FantasyLeaderboardEntry[];
  missions: WeeklyMission[];
  lastUpdated: string | null;
}

interface FantasyStoreActions {
  enterCompetition: (tier: FantasyTier) => boolean;
  pickStock: (categoryId: StockCategoryId, ticker: string, stockName: string, mockPrice: number) => void;
  lockDraft: () => void;
  simulateFinalPrices: () => void;
  claimResults: () => void;
  resetForNewWeek: () => void;
  getLeaderboardWithLocal: () => FantasyLeaderboardEntry[];
  getAverageReturn: () => number;
}

type FantasyStore = FantasyStoreState & FantasyStoreActions;

export const useFantasyStore = create<FantasyStore>()(
  persist(
    (set, get) => ({
      currentEntry: null,
      leaderboard: [],
      missions: [],
      lastUpdated: null,

      enterCompetition: (tier: FantasyTier): boolean => {
        const tierConfig = TIER_CONFIGS[tier];
        if (!tierConfig) return false;

        // Lazy import to avoid circular dependency at module load
        const { useEconomyStore } = require('../economy/useEconomyStore');
        const spent = useEconomyStore.getState().spendCoins(tierConfig.entryCost);
        if (!spent) return false;

        const weekId = getCurrentWeekId();
        const prevEntry = get().currentEntry;
        const streak = prevEntry?.weekId !== weekId
          ? (prevEntry?.draftStreakWeeks ?? 0) + 1
          : (prevEntry?.draftStreakWeeks ?? 0);

        const newEntry: WeeklyEntry = {
          weekId,
          tier,
          coinsPaid: tierConfig.entryCost,
          picks: [],
          lockedAt: null,
          finalRank: null,
          coinsReturned: null,
          xpEarned: null,
          claimed: false,
          draftStreakWeeks: streak,
        };

        const missions = getWeeklyMissions(weekId);
        const leaderboard = getMockLeaderboard(tier, weekId);

        set({ currentEntry: newEntry, leaderboard, missions, lastUpdated: new Date().toISOString() });
        return true;
      },

      pickStock: (categoryId: StockCategoryId, ticker: string, stockName: string, mockPrice: number) => {
        const { currentEntry } = get();
        if (!currentEntry || currentEntry.lockedAt) return;

        const existing = currentEntry.picks.filter((p) => p.categoryId !== categoryId);
        const newPick: DraftPick = {
          categoryId,
          ticker,
          stockName,
          entryPrice: mockPrice,
          finalPrice: null,
          returnPercent: null,
        };

        set({
          currentEntry: { ...currentEntry, picks: [...existing, newPick] },
          lastUpdated: new Date().toISOString(),
        });
      },

      lockDraft: () => {
        const { currentEntry } = get();
        if (!currentEntry || currentEntry.lockedAt) return;
        if (currentEntry.picks.length < 5) return;

        set({
          currentEntry: { ...currentEntry, lockedAt: new Date().toISOString() },
          lastUpdated: new Date().toISOString(),
        });
      },

      simulateFinalPrices: () => {
        const { currentEntry } = get();
        if (!currentEntry) return;

        const updatedPicks = currentEntry.picks.map((pick): DraftPick => {
          const returnPct = simulateWeeklyReturn(pick.ticker, currentEntry.weekId);
          const finalPrice = pick.entryPrice * (1 + returnPct / 100);
          return { ...pick, finalPrice, returnPercent: returnPct };
        });

        set({
          currentEntry: { ...currentEntry, picks: updatedPicks },
          lastUpdated: new Date().toISOString(),
        });
      },

      claimResults: () => {
        const { currentEntry, leaderboard } = get();
        if (!currentEntry || currentEntry.claimed) return;

        // Average return across all 5 picks
        const avgReturn = get().getAverageReturn();

        // Coins returned: entry × (1 + avgReturn%)
        const coinsReturned = Math.round(currentEntry.coinsPaid * (1 + avgReturn / 100));

        // Find rank among leaderboard (local player)
        const localEntry = leaderboard.find((e) => e.isLocal);
        const rank = localEntry?.rank ?? leaderboard.length + 1;

        // XP: tier prizes for top 5, consolation otherwise
        const tierConfig = TIER_CONFIGS[currentEntry.tier];
        let xpEarned = 25; // consolation
        if (rank >= 1 && rank <= 5) {
          xpEarned = tierConfig.prizeXP[rank - 1];
        }

        // Streak bonus XP
        const streakBonus = DRAFT_STREAK_BONUSES
          .filter((b) => currentEntry.draftStreakWeeks >= b.weeks)
          .reduce((max, b) => Math.max(max, b.bonusXP), 0);
        xpEarned += streakBonus;

        // Mission bonus XP
        const { missions } = get();
        const missionBonus = missions.filter((m) => m.completed).reduce((s, m) => s + m.bonusXP, 0);
        xpEarned += missionBonus;

        // Apply to economy
        const { useEconomyStore } = require('../economy/useEconomyStore');
        useEconomyStore.getState().addCoins(coinsReturned);
        useEconomyStore.getState().addXP(xpEarned, 'challenge_complete');

        set({
          currentEntry: {
            ...currentEntry,
            finalRank: rank,
            coinsReturned,
            xpEarned,
            claimed: true,
          },
          lastUpdated: new Date().toISOString(),
        });
      },

      resetForNewWeek: () => {
        set({ currentEntry: null, leaderboard: [], missions: [], lastUpdated: new Date().toISOString() });
      },

      getLeaderboardWithLocal: (): FantasyLeaderboardEntry[] => {
        const { currentEntry, leaderboard } = get();
        if (!currentEntry) return leaderboard;

        const avgReturn = get().getAverageReturn();
        const localEntry: FantasyLeaderboardEntry = {
          rank: 0,
          playerId: 'local',
          displayName: 'אתה',
          returnPercent: Math.round(avgReturn * 10) / 10,
          isLocal: true,
          change: 'new',
          leaguePosition: 'stable',
        };

        const merged = [...leaderboard.filter((e) => !e.isLocal), localEntry]
          .sort((a, b) => b.returnPercent - a.returnPercent)
          .map((e, idx) => ({
            ...e,
            rank: idx + 1,
            leaguePosition: (idx < Math.ceil(leaderboard.length * 0.2)
              ? 'promoted'
              : idx > Math.floor(leaderboard.length * 0.8)
              ? 'demoted'
              : 'stable') as FantasyLeaderboardEntry['leaguePosition'],
          }));

        return merged;
      },

      getAverageReturn: (): number => {
        const { currentEntry } = get();
        if (!currentEntry || currentEntry.picks.length === 0) return 0;
        const picks = currentEntry.picks.filter((p) => p.returnPercent !== null);
        if (picks.length === 0) return 0;
        const sum = picks.reduce((s, p) => s + (p.returnPercent ?? 0), 0);
        return Math.round((sum / picks.length) * 100) / 100;
      },
    }),
    {
      name: 'fantasy-store-v2',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        currentEntry: state.currentEntry,
        leaderboard: state.leaderboard,
        missions: state.missions,
        lastUpdated: state.lastUpdated,
      }),
    },
  ),
);
