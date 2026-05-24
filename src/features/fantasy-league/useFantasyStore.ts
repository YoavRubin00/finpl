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
  /** Set how many coins are allocated to one pick. Clamped so total ≤ entry pool. */
  setAllocation: (ticker: string, amount: number) => void;
  /** Reset all allocations to equal-share of the entry pool. */
  redistributeAllocationsEqually: () => void;
  /** Mark a pick as ×2 leverage (captain). Pass null to clear. */
  setCaptain: (ticker: string | null) => void;
  /** Mark a pick as ×1.5 leverage (vice). Pass null to clear. */
  setVice: (ticker: string | null) => void;
  /** True when picks=5, captain+vice set on distinct stocks, allocations sum to entry pool. */
  isReadyForBattle: () => boolean;
  lockDraft: () => void;
  simulateFinalPrices: () => void;
  claimResults: () => void;
  resetForNewWeek: () => void;
  getLeaderboardWithLocal: () => FantasyLeaderboardEntry[];
  /** Allocation-weighted average return (% of pool), without leverage. */
  getAverageReturn: () => number;
  /** Allocation-weighted return with ×2 multiplier applied to the leveraged pick. */
  getEffectiveAverageReturn: () => number;
  /** Sum of all picks' allocations. */
  getAllocatedTotal: () => number;
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
          captainTicker: null,
          viceTicker: null,
        };

        const missions = getWeeklyMissions(weekId);
        const leaderboard = getMockLeaderboard(tier, weekId);

        set({ currentEntry: newEntry, leaderboard, missions, lastUpdated: new Date().toISOString() });
        return true;
      },

      pickStock: (categoryId: StockCategoryId, ticker: string, stockName: string, mockPrice: number) => {
        const { currentEntry } = get();
        if (!currentEntry || currentEntry.lockedAt) return;

        // Replace any existing pick in this category — one per category.
        const existing = currentEntry.picks.filter((p) => p.categoryId !== categoryId);
        const newPick: DraftPick = {
          categoryId,
          ticker,
          stockName,
          entryPrice: mockPrice,
          finalPrice: null,
          returnPercent: null,
          allocation: 0,
        };

        // Auto-equalize allocations across the new pick set.
        const newPicks = [...existing, newPick];
        const each = Math.floor(currentEntry.coinsPaid / newPicks.length);
        const remainder = currentEntry.coinsPaid - each * newPicks.length;
        const rebalanced = newPicks.map((p, i) => ({
          ...p,
          allocation: each + (i === 0 ? remainder : 0),
        }));

        set({
          currentEntry: { ...currentEntry, picks: rebalanced },
          lastUpdated: new Date().toISOString(),
        });
      },

      setAllocation: (ticker: string, amount: number) => {
        const { currentEntry } = get();
        if (!currentEntry || currentEntry.lockedAt) return;
        const pick = currentEntry.picks.find((p) => p.ticker === ticker);
        if (!pick) return;

        const otherSum = currentEntry.picks
          .filter((p) => p.ticker !== ticker)
          .reduce((s, p) => s + p.allocation, 0);
        const maxAllowed = currentEntry.coinsPaid - otherSum;
        const clamped = Math.max(0, Math.min(maxAllowed, Math.round(amount)));

        const updatedPicks = currentEntry.picks.map((p) =>
          p.ticker === ticker ? { ...p, allocation: clamped } : p,
        );

        set({
          currentEntry: { ...currentEntry, picks: updatedPicks },
          lastUpdated: new Date().toISOString(),
        });
      },

      redistributeAllocationsEqually: () => {
        const { currentEntry } = get();
        if (!currentEntry || currentEntry.lockedAt) return;
        if (currentEntry.picks.length === 0) return;
        const each = Math.floor(currentEntry.coinsPaid / currentEntry.picks.length);
        const remainder = currentEntry.coinsPaid - each * currentEntry.picks.length;
        const updatedPicks = currentEntry.picks.map((p, i) => ({
          ...p,
          allocation: each + (i === 0 ? remainder : 0),
        }));
        set({
          currentEntry: { ...currentEntry, picks: updatedPicks },
          lastUpdated: new Date().toISOString(),
        });
      },

      setCaptain: (ticker: string | null) => {
        const { currentEntry } = get();
        if (!currentEntry) return;
        if (ticker !== null && !currentEntry.picks.some((p) => p.ticker === ticker)) return;
        // Captain and vice must be distinct — only clear vice if it collides.
        const nextVice = currentEntry.viceTicker === ticker ? null : currentEntry.viceTicker;
        set({
          currentEntry: { ...currentEntry, captainTicker: ticker, viceTicker: nextVice },
          lastUpdated: new Date().toISOString(),
        });
      },

      setVice: (ticker: string | null) => {
        const { currentEntry } = get();
        if (!currentEntry) return;
        if (ticker !== null && !currentEntry.picks.some((p) => p.ticker === ticker)) return;
        const nextCaptain = currentEntry.captainTicker === ticker ? null : currentEntry.captainTicker;
        set({
          currentEntry: { ...currentEntry, viceTicker: ticker, captainTicker: nextCaptain },
          lastUpdated: new Date().toISOString(),
        });
      },

      isReadyForBattle: (): boolean => {
        const { currentEntry } = get();
        if (!currentEntry) return false;
        const allocSum = currentEntry.picks.reduce((s, p) => s + p.allocation, 0);
        return (
          currentEntry.picks.length === 5 &&
          currentEntry.captainTicker !== null &&
          currentEntry.viceTicker !== null &&
          currentEntry.captainTicker !== currentEntry.viceTicker &&
          allocSum === currentEntry.coinsPaid
        );
      },

      lockDraft: () => {
        const { currentEntry } = get();
        if (!currentEntry || currentEntry.lockedAt) return;
        if (currentEntry.picks.length < 5) return;
        // All allocations must sum to the entry pool.
        const sumAllocation = currentEntry.picks.reduce((s, p) => s + p.allocation, 0);
        if (sumAllocation !== currentEntry.coinsPaid) return;

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

        // Find rank among leaderboard (local player)
        const localEntry = leaderboard.find((e) => e.isLocal);
        const rank = localEntry?.rank ?? leaderboard.length + 1;

        // Place-based prizes (top 5) — uses tier's prize multipliers vs entryCost.
        // Outside top 5: consolation 0.1× of entry to soften the loss.
        const tierConfig = TIER_CONFIGS[currentEntry.tier];
        let coinsReturned = Math.round(currentEntry.coinsPaid * 0.1);
        let xpEarned = 25;
        let diamondsEarned = 0;
        if (rank >= 1 && rank <= 5) {
          coinsReturned = Math.round(currentEntry.coinsPaid * tierConfig.prizeMultipliers[rank - 1]);
          xpEarned = tierConfig.prizeXP[rank - 1];
          diamondsEarned = tierConfig.prizeDiamonds[rank - 1];
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
        if (diamondsEarned > 0) {
          useEconomyStore.getState().addGems(diamondsEarned);
        }

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

        // Promotion/relegation is disabled — every entry is 'stable'.
        // Tier is a fixed stake choice (silver / gold / diamond), not a ladder.
        const merged = [...leaderboard.filter((e) => !e.isLocal), localEntry]
          .sort((a, b) => b.returnPercent - a.returnPercent)
          .map((e, idx) => ({
            ...e,
            rank: idx + 1,
            leaguePosition: 'stable' as const,
          }));

        return merged;
      },

      getAverageReturn: (): number => {
        const { currentEntry } = get();
        if (!currentEntry || currentEntry.picks.length === 0) return 0;
        const totalAlloc = currentEntry.picks.reduce((s, p) => s + p.allocation, 0);
        if (totalAlloc === 0) return 0;
        const weighted = currentEntry.picks.reduce(
          (s, p) => s + p.allocation * (p.returnPercent ?? 0),
          0,
        );
        return Math.round((weighted / totalAlloc) * 100) / 100;
      },

      getEffectiveAverageReturn: (): number => {
        const { currentEntry } = get();
        if (!currentEntry || currentEntry.picks.length === 0) return 0;
        const totalAlloc = currentEntry.picks.reduce((s, p) => s + p.allocation, 0);
        if (totalAlloc === 0) return 0;
        const weighted = currentEntry.picks.reduce((s, p) => {
          const r = p.returnPercent ?? 0;
          const mult =
            currentEntry.captainTicker === p.ticker ? 2 :
            currentEntry.viceTicker === p.ticker ? 1.5 :
            1;
          return s + p.allocation * r * mult;
        }, 0);
        return Math.round((weighted / totalAlloc) * 100) / 100;
      },

      getAllocatedTotal: (): number => {
        const { currentEntry } = get();
        if (!currentEntry) return 0;
        return currentEntry.picks.reduce((s, p) => s + p.allocation, 0);
      },
    }),
    {
      name: 'fantasy-store-v5',
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
