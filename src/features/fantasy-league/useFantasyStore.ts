import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
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
  getCompetitionWeekId,
  getNextCompetitionWeekId,
  isDraftOpen,
  REQUIRED_PICKS,
  DRAFT_STREAK_BONUSES,
} from './fantasyData';
import { israelDatePlusDays } from '../../utils/israelTime';
import { captureEvent } from '../../lib/posthog';

// ---------------------------------------------------------------------------
// Settlement helpers (shared by the Monday-09:00 auto-rollover)
// ---------------------------------------------------------------------------

/** Returns a copy of `entry` with each pick's final price + weekly return
 *  filled in. Uses the real Yahoo weekly return ONLY when `useLive` is true —
 *  i.e. we're settling the week that JUST ended, so the API's trailing-7-day
 *  window actually lines up with this entry's Mon→Fri. When the app is opened
 *  late (settling an older week), the live window is the WRONG week, so we fall
 *  back to the deterministic, week-anchored sim. Pure. */
function settleEntry(entry: WeeklyEntry, useLive: boolean): WeeklyEntry {
  const { getLiveWeeklyReturn } = require('./useLiveReturnsStore');
  const picks = entry.picks.map((pick): DraftPick => {
    const live = useLive ? getLiveWeeklyReturn(pick.ticker) : null;
    const returnPct = live ?? simulateWeeklyReturn(pick.ticker, entry.weekId);
    return { ...pick, finalPrice: pick.entryPrice * (1 + returnPct / 100), returnPercent: returnPct };
  });
  return { ...entry, picks };
}

/** Credits the participation floor for a settled week (P0-1 frozen model: 10%
 *  coins back + 25 base XP + the user's OWN draft-streak & completed-mission XP;
 *  NO rank/tier multipliers, NO diamonds — there is no real server settle). Fires
 *  the animated economy counters and returns the amounts for display. */
function creditParticipationFloor(
  entry: WeeklyEntry,
  missions: WeeklyMission[],
): { coinsReturned: number; xpEarned: number } {
  const { useEconomyUIStore } = require('../economy/useEconomyUIStore');
  // Abandoned join — paid the entry but never drafted a single pick → FULL
  // refund, not a 10% floor. The user never got to play; charging 90% for a
  // team they never saw is a silent coin leak (Fable P1-7).
  if (entry.picks.length === 0) {
    useEconomyUIStore.getState().addCoins(entry.coinsPaid);
    return { coinsReturned: entry.coinsPaid, xpEarned: 0 };
  }
  const coinsReturned = Math.round(entry.coinsPaid * 0.1);
  let xpEarned = 25;
  const streakBonus = DRAFT_STREAK_BONUSES.filter((b) => entry.draftStreakWeeks >= b.weeks).reduce(
    (max, b) => Math.max(max, b.bonusXP),
    0,
  );
  xpEarned += streakBonus;
  const missionBonus = missions.filter((m) => m.completed).reduce((s, m) => s + m.bonusXP, 0);
  xpEarned += missionBonus;
  useEconomyUIStore.getState().addCoins(coinsReturned);
  useEconomyUIStore.getState().addXP(xpEarned, 'challenge_complete');
  return { coinsReturned, xpEarned };
}

// ---------------------------------------------------------------------------
// State & actions
// ---------------------------------------------------------------------------

interface FantasyStoreState {
  /** The team competing in the LIVE week (Mon 09:00 → next Mon 09:00). */
  currentEntry: WeeklyEntry | null;
  /** The team being drafted for NEXT week — built in parallel during the
   *  Thu 09:00 → Mon 09:00 draft window; promoted to `currentEntry` at rollover. */
  nextEntry: WeeklyEntry | null;
  /** A just-ended week, settled + already credited, awaiting the user to see the
   *  results card in the lobby (a Monday return hook). Cleared on dismiss. */
  pendingResult: WeeklyEntry | null;
  leaderboard: FantasyLeaderboardEntry[];
  missions: WeeklyMission[];
  lastUpdated: string | null;
  /** Coins owed back from a persist migration that dropped a paid in-flight
   *  entry — credited on the next rolloverIfDue so none are silently lost. */
  refundDue: number;
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
  /** Advances the weekly cycle at Monday 09:00 IL: settles + credits the
   *  outgoing live week (→ pendingResult), promotes the drafted next-week team
   *  to live, and clears any stale entry left from a past week. Idempotent —
   *  safe to call on every lobby mount + tick. */
  rolloverIfDue: (now?: Date) => void;
  /** Dismisses the lobby results card (pendingResult is already credited). */
  dismissResult: () => void;
  getLeaderboardWithLocal: () => FantasyLeaderboardEntry[];
  /** Allocation-weighted average return (% of pool), without leverage. */
  getAverageReturn: () => number;
  /** Allocation-weighted return with ×2 multiplier applied to the leveraged pick. */
  getEffectiveAverageReturn: () => number;
  /** Sum of all picks' allocations. */
  getAllocatedTotal: () => number;
  /** Reset to initial state — used by global resetAllLocalStores. */
  reset: () => void;
}

type FantasyStore = FantasyStoreState & FantasyStoreActions;

export const useFantasyStore = create<FantasyStore>()(
  persist(
    (set, get) => ({
      currentEntry: null,
      nextEntry: null,
      pendingResult: null,
      leaderboard: [],
      missions: [],
      lastUpdated: null,
      refundDue: 0,

      enterCompetition: (tier: FantasyTier): boolean => {
        const tierConfig = TIER_CONFIGS[tier];
        if (!tierConfig) return false;

        // Settle any due rollover FIRST — otherwise a stale nextEntry from a
        // past week could be silently overwritten here and its coins lost
        // (e.g. reaching /fantasy/draft via a deep link before the lobby ran).
        get().rolloverIfDue();

        // Drafting is always for the UPCOMING competition week, and only while
        // the draft window is open (Thu 09:00 → Mon 09:00 IL).
        if (!isDraftOpen()) return false;
        const weekId = getNextCompetitionWeekId();
        // Already drafted this upcoming week → don't re-charge; continue editing.
        const existingNext = get().nextEntry;
        if (existingNext && existingNext.weekId === weekId) return false;

        // Lazy imports to avoid circular dependency at module load.
        // Dev economy: balance lives in the react-query cache; spends go
        // through fireEconomyDelta (same pattern as useSharkWagerStore).
        const { queryClient } = require('../../lib/queryClient');
        const { economyQueryKey } = require('../economy/useEconomy');
        const { fireEconomyDelta } = require('../economy/useEconomyUIStore');
        const coins: number =
          queryClient.getQueryData(economyQueryKey)?.coins ?? 0;
        if (coins < tierConfig.entryCost) return false;
        fireEconomyDelta({ coinsDelta: -tierConfig.entryCost });

        // Draft streak = consecutive weeks drafted, measured against the last
        // team that went live (currentEntry).
        const prevEntry = get().currentEntry;
        const streak =
          prevEntry?.weekId !== weekId
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

        // The team stays in the `nextEntry` slot until Monday 09:00, when
        // rolloverIfDue() promotes it to the live competition.
        set({ nextEntry: newEntry, lastUpdated: new Date().toISOString() });
        try {
          captureEvent('fantasy_entered', { tier, draft_streak: streak, week_id: weekId });
        } catch { /* non-fatal */ }
        return true;
      },

      // ── Draft-building mutations: all operate on `nextEntry` (the team being
      //    built for next week), never the live `currentEntry`. ──
      pickStock: (categoryId: StockCategoryId, ticker: string, stockName: string, mockPrice: number) => {
        const { nextEntry } = get();
        if (!nextEntry || nextEntry.lockedAt) return;

        // Replace any existing pick in this category — one per category.
        const existing = nextEntry.picks.filter((p) => p.categoryId !== categoryId);
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
        const each = Math.floor(nextEntry.coinsPaid / newPicks.length);
        const remainder = nextEntry.coinsPaid - each * newPicks.length;
        const rebalanced = newPicks.map((p, i) => ({
          ...p,
          allocation: each + (i === 0 ? remainder : 0),
        }));

        set({
          nextEntry: { ...nextEntry, picks: rebalanced },
          lastUpdated: new Date().toISOString(),
        });
      },

      setAllocation: (ticker: string, amount: number) => {
        const { nextEntry } = get();
        if (!nextEntry || nextEntry.lockedAt) return;
        const pick = nextEntry.picks.find((p) => p.ticker === ticker);
        if (!pick) return;

        const otherSum = nextEntry.picks
          .filter((p) => p.ticker !== ticker)
          .reduce((s, p) => s + p.allocation, 0);
        const maxAllowed = nextEntry.coinsPaid - otherSum;
        const clamped = Math.max(0, Math.min(maxAllowed, Math.round(amount)));

        const updatedPicks = nextEntry.picks.map((p) =>
          p.ticker === ticker ? { ...p, allocation: clamped } : p,
        );

        set({
          nextEntry: { ...nextEntry, picks: updatedPicks },
          lastUpdated: new Date().toISOString(),
        });
      },

      redistributeAllocationsEqually: () => {
        const { nextEntry } = get();
        if (!nextEntry || nextEntry.lockedAt) return;
        if (nextEntry.picks.length === 0) return;
        const each = Math.floor(nextEntry.coinsPaid / nextEntry.picks.length);
        const remainder = nextEntry.coinsPaid - each * nextEntry.picks.length;
        const updatedPicks = nextEntry.picks.map((p, i) => ({
          ...p,
          allocation: each + (i === 0 ? remainder : 0),
        }));
        set({
          nextEntry: { ...nextEntry, picks: updatedPicks },
          lastUpdated: new Date().toISOString(),
        });
      },

      setCaptain: (ticker: string | null) => {
        const { nextEntry } = get();
        // Locked draft = leverage frozen for the whole competition (same rule
        // as pickStock/setAllocation) — switching captain mid-week would let
        // users retro-fit ×2 onto whichever pick happens to be winning.
        if (!nextEntry || nextEntry.lockedAt) return;
        if (ticker !== null && !nextEntry.picks.some((p) => p.ticker === ticker)) return;
        // Captain and vice must be distinct — only clear vice if it collides.
        const nextVice = nextEntry.viceTicker === ticker ? null : nextEntry.viceTicker;
        set({
          nextEntry: { ...nextEntry, captainTicker: ticker, viceTicker: nextVice },
          lastUpdated: new Date().toISOString(),
        });
      },

      setVice: (ticker: string | null) => {
        const { nextEntry } = get();
        if (!nextEntry || nextEntry.lockedAt) return;
        if (ticker !== null && !nextEntry.picks.some((p) => p.ticker === ticker)) return;
        const nextCaptain = nextEntry.captainTicker === ticker ? null : nextEntry.captainTicker;
        set({
          nextEntry: { ...nextEntry, viceTicker: ticker, captainTicker: nextCaptain },
          lastUpdated: new Date().toISOString(),
        });
      },

      isReadyForBattle: (): boolean => {
        const { nextEntry } = get();
        if (!nextEntry) return false;
        const allocSum = nextEntry.picks.reduce((s, p) => s + p.allocation, 0);
        return (
          nextEntry.picks.length === REQUIRED_PICKS &&
          nextEntry.captainTicker !== null &&
          nextEntry.viceTicker !== null &&
          nextEntry.captainTicker !== nextEntry.viceTicker &&
          allocSum === nextEntry.coinsPaid
        );
      },

      lockDraft: () => {
        const { nextEntry } = get();
        if (!nextEntry || nextEntry.lockedAt) return;
        if (nextEntry.picks.length < REQUIRED_PICKS) return;
        // Captain + vice are mandatory and must be distinct (parity with
        // isReadyForBattle — a direct lock must not slip a captainless team by).
        if (!nextEntry.captainTicker || !nextEntry.viceTicker) return;
        if (nextEntry.captainTicker === nextEntry.viceTicker) return;
        // All allocations must sum to the entry pool.
        const sumAllocation = nextEntry.picks.reduce((s, p) => s + p.allocation, 0);
        if (sumAllocation !== nextEntry.coinsPaid) return;

        set({
          nextEntry: { ...nextEntry, lockedAt: new Date().toISOString() },
          lastUpdated: new Date().toISOString(),
        });
        try {
          captureEvent('fantasy_draft_locked', {
            tier: nextEntry.tier,
            picks: nextEntry.picks.length,
            has_captain: !!nextEntry.captainTicker,
            has_vice: !!nextEntry.viceTicker,
          });
        } catch { /* non-fatal */ }
      },

      rolloverIfDue: (now: Date = new Date()) => {
        const { currentEntry, nextEntry, pendingResult, missions, refundDue } = get();
        // Credit any migration refund owed (a paid entry dropped by persist-v2),
        // exactly once, the first time the cycle is checked (Fable P1-9).
        if (refundDue > 0) {
          const { useEconomyUIStore } = require('../economy/useEconomyUIStore');
          useEconomyUIStore.getState().addCoins(refundDue);
          set({ refundDue: 0 });
        }
        const liveWeekId = getCompetitionWeekId(now);

        const isRolloverA = !!nextEntry && nextEntry.weekId <= liveWeekId;
        const isStaleB = !!currentEntry && currentEntry.weekId < liveWeekId;
        if (!isRolloverA && !isStaleB) return; // nothing due — cheap early exit
        try {
          captureEvent('fantasy_rolled_over', { promoted: isRolloverA, had_live: !!currentEntry });
        } catch { /* non-fatal */ }

        // Fold any still-unclaimed prior result into the economy now (rare —
        // user ignored last week's card for a whole week) so no coins are lost
        // when we overwrite pendingResult below.
        if (pendingResult && !pendingResult.claimed) {
          creditParticipationFloor(pendingResult, missions);
        }

        // Settle + credit the outgoing live week (if any), as the new card.
        let newPending: WeeklyEntry | null = null;
        if (currentEntry && !currentEntry.claimed) {
          // Live returns line up only when we're settling the week that JUST
          // ended (its Monday is exactly this liveWeekId); else use the sim.
          const liveWindowValid = israelDatePlusDays(currentEntry.weekId, 7) === liveWeekId;
          const settled = settleEntry(currentEntry, liveWindowValid);
          const { coinsReturned, xpEarned } = creditParticipationFloor(settled, missions);
          newPending = { ...settled, finalRank: null, coinsReturned, xpEarned, claimed: true };
        }

        if (isRolloverA && nextEntry) {
          // The drafted team goes live; fresh leaderboard + missions for it.
          set({
            currentEntry: nextEntry,
            nextEntry: null,
            pendingResult: newPending,
            leaderboard: getMockLeaderboard(nextEntry.tier, nextEntry.weekId),
            missions: getWeeklyMissions(nextEntry.weekId),
            lastUpdated: new Date().toISOString(),
          });
          return;
        }

        // isStaleB: week ended, nothing drafted → clear the live slot (un-sticks
        // a stale leftover entry — the old soft-lock bug).
        set({
          currentEntry: null,
          pendingResult: newPending,
          leaderboard: [],
          missions: [],
          lastUpdated: new Date().toISOString(),
        });
      },

      dismissResult: () => {
        set({ pendingResult: null, lastUpdated: new Date().toISOString() });
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

      reset: () => {
        set({
          currentEntry: null,
          nextEntry: null,
          pendingResult: null,
          leaderboard: [],
          missions: [],
          lastUpdated: null,
          refundDue: 0,
        });
      },
    }),
    {
      name: 'fantasy-store-v5',
      storage: createJSONStorage(() => zustandStorage),
      // v1: purge the FABRICATED leaderboard that pre-purge builds persisted
      //     (fake opponents from the old getMockLeaderboard).
      // v2: the weekly model changed to two slots (currentEntry + nextEntry)
      //     with Monday-anchored weekIds. Old single-slot entries use the
      //     incompatible "YYYY-Wnn" weekId format, so we drop any in-flight
      //     entry and start the new cycle clean rather than mis-compare it.
      version: 2,
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<FantasyStoreState>;
        if (version < 2) {
          return {
            ...state,
            currentEntry: null,
            nextEntry: null,
            pendingResult: null,
            leaderboard: [],
            missions: [],
            // Refund coins from any paid in-flight entry we're dropping, so the
            // model change doesn't silently eat up to 100k coins (Fable P1-9).
            refundDue:
              (state.currentEntry?.coinsPaid ?? 0) +
              (state.nextEntry?.coinsPaid ?? 0) +
              (state.refundDue ?? 0),
          } as FantasyStoreState;
        }
        return state as FantasyStoreState;
      },
      partialize: (state) => ({
        currentEntry: state.currentEntry,
        nextEntry: state.nextEntry,
        pendingResult: state.pendingResult,
        leaderboard: state.leaderboard,
        missions: state.missions,
        lastUpdated: state.lastUpdated,
        refundDue: state.refundDue,
      }),
    },
  ),
);

registerLocalStore('fantasy-store', useFantasyStore, 'fantasy-store');
