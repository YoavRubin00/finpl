/**
 * Local store for the Daily News Challenge.
 *
 * Persists per-device: today's payload (cache), per-item answers, the
 * regular/Pro chest state, and an INDEPENDENT streak (separate from
 * daily-quiz and daily-quests). When the dateKey changes the per-day slice
 * resets but `streak` is preserved (decremented if a day was skipped).
 *
 * Reward economics mirror useDailyQuestsStore — XP/coin grants flow through
 * useEconomyUIStore so the chest payout shows up in the global hub strip.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { useEconomyUIStore } from '../economy/useEconomyUIStore';
import { recordDailyActivity } from '../../lib/api/streak';
import { queryClient } from '../../lib/queryClient';
import { streakQueryKey } from '../economy/useStreak';
import type { StreakState } from '../../lib/api/streak';
import type { DailyChallenge, ItemAnswer } from './types';

/** Israel-local YYYY-MM-DD — matches the server's day boundary. */
function todayIsraelDate(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date());
}

/** YYYY-MM-DD anchored to the device's local time. Server uses Asia/Jerusalem;
 *  for most users in Israel these match. */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** True if `b` is the calendar day right after `a` (UTC-day arithmetic). */
function isConsecutive(a: string, b: string): boolean {
  const dayA = new Date(`${a}T00:00:00Z`).getTime();
  const dayB = new Date(`${b}T00:00:00Z`).getTime();
  return dayB - dayA === 24 * 60 * 60 * 1000;
}

/* ─────────────────── Reward constants ─────────────────── */

const CHALLENGE_XP_REWARD = 60;
const CHALLENGE_COIN_REWARD = 140;
const CHALLENGE_GEM_AMOUNT = 1;
const CHALLENGE_PRO_XP_MULTIPLIER = 2;
const CHALLENGE_PRO_COIN_MULTIPLIER = 2;
const CHALLENGE_PRO_GEMS_GUARANTEED = 3;
const CHALLENGE_STREAK_BONUS_STEP = 5;   // every 5-day milestone
const CHALLENGE_STREAK_BONUS_PCT = 0.1;  // +10%
/** Bonus gem(s) added to BOTH chests when the user answered 2/2 correctly today. */
const CHALLENGE_PERFECT_BONUS_GEMS = 1;

export interface ChallengeRewardSummary {
  xp: number;
  coins: number;
  gems: number;
  streakBonusPct: number;
  /** Set when the user answered 2/2 correctly — UI uses this to render the
   *  "perfect day" pill/burst. The gem count already includes the bonus. */
  perfectBonusApplied: boolean;
}

function streakMultiplier(streak: number): number {
  return 1 + Math.floor(streak / CHALLENGE_STREAK_BONUS_STEP) * CHALLENGE_STREAK_BONUS_PCT;
}

function streakBonusPct(streak: number): number {
  return Math.floor(streak / CHALLENGE_STREAK_BONUS_STEP) * Math.round(CHALLENGE_STREAK_BONUS_PCT * 100);
}

export function previewRegularReward(streak: number, perfect: boolean = false): ChallengeRewardSummary {
  const m = streakMultiplier(streak);
  return {
    xp: Math.round(CHALLENGE_XP_REWARD * m),
    coins: Math.round(CHALLENGE_COIN_REWARD * m),
    gems: CHALLENGE_GEM_AMOUNT + (perfect ? CHALLENGE_PERFECT_BONUS_GEMS : 0),
    streakBonusPct: streakBonusPct(streak),
    perfectBonusApplied: perfect,
  };
}

export function previewProReward(streak: number, perfect: boolean = false): ChallengeRewardSummary {
  const m = streakMultiplier(streak);
  return {
    xp: Math.round(CHALLENGE_XP_REWARD * CHALLENGE_PRO_XP_MULTIPLIER * m),
    coins: Math.round(CHALLENGE_COIN_REWARD * CHALLENGE_PRO_COIN_MULTIPLIER * m),
    gems: CHALLENGE_PRO_GEMS_GUARANTEED + (perfect ? CHALLENGE_PERFECT_BONUS_GEMS : 0),
    streakBonusPct: streakBonusPct(streak),
    perfectBonusApplied: perfect,
  };
}

/* ─────────────────── Store ─────────────────── */

interface NewsChallengeState {
  /** Today's payload (cached for offline + instant render). */
  todayChallenge: DailyChallenge | null;
  /** Date-key of the cached payload — used to invalidate on day rollover. */
  cachedFor: string | null;
  /** Per-item answers for today; index matches `todayChallenge.items`. */
  answered: [ItemAnswer | null, ItemAnswer | null];
  /** Chests already opened today. */
  regularChestOpened: boolean;
  proChestOpened: boolean;
  /** Streak (news-challenge local) — increments when BOTH items answered.
   *  Note: the global streak lives in useStreak/server. We also bump that one
   *  via `recordDailyActivity` so notifications see this user as active. */
  streak: number;
  lastCompletedDate: string | null;

  /** Lifetime count of days the user answered 2/2 correctly. */
  perfectDays: number;
  /** Convenience: was today a perfect day? Derived from `answered`. */
  todayPerfect: () => boolean;

  /* ─── actions ─── */
  setTodayChallenge: (challenge: DailyChallenge) => void;
  recordAnswer: (itemIdx: 0 | 1, selectedIdx: number, wasCorrect: boolean) => void;
  hasCompletedToday: () => boolean;
  claimRegularChest: () => ChallengeRewardSummary | null;
  claimProChest: () => ChallengeRewardSummary | null;
}

export const useDailyNewsChallengeStore = create<NewsChallengeState>()(
  persist(
    (set, get) => ({
      todayChallenge: null,
      cachedFor: null,
      answered: [null, null],
      regularChestOpened: false,
      proChestOpened: false,
      streak: 0,
      lastCompletedDate: null,
      perfectDays: 0,

      todayPerfect: () => {
        const { answered } = get();
        return (
          answered[0]?.wasCorrect === true && answered[1]?.wasCorrect === true
        );
      },

      setTodayChallenge: (challenge) => {
        const state = get();
        // Day rollover — reset per-day slice but PRESERVE streak.
        if (state.cachedFor !== challenge.dateKey) {
          set({
            todayChallenge: challenge,
            cachedFor: challenge.dateKey,
            answered: [null, null],
            regularChestOpened: false,
            proChestOpened: false,
          });
        } else {
          // Same day, refresh payload (e.g. images filled in later).
          set({ todayChallenge: challenge });
        }
      },

      recordAnswer: (itemIdx, selectedIdx, wasCorrect) => {
        const state = get();
        if (state.answered[itemIdx]) return; // can't re-answer
        const next: [ItemAnswer | null, ItemAnswer | null] = [...state.answered];
        next[itemIdx] = {
          selectedIdx,
          wasCorrect,
          answeredAt: new Date().toISOString(),
        };

        // Bump streak only when BOTH items are now answered for the first time today.
        const bothAnswered = next[0] !== null && next[1] !== null;
        let { streak, lastCompletedDate, perfectDays } = state;
        if (bothAnswered) {
          const today = state.cachedFor ?? todayKey();
          if (lastCompletedDate !== today) {
            const consecutive = lastCompletedDate ? isConsecutive(lastCompletedDate, today) : false;
            streak = consecutive ? streak + 1 : 1;
            lastCompletedDate = today;
            const bothCorrect = next[0]?.wasCorrect === true && next[1]?.wasCorrect === true;
            if (bothCorrect) perfectDays += 1;
          }
          // Tell the server this user was active today. Without this the
          // global Captain Shark notification scheduler will think the user
          // was idle and fire a misleading "📉 יומיים בלי FinPlay" push.
          // Fire-and-forget; the server dedups by date_il.
          void recordDailyActivity(todayIsraelDate())
            .then((res) => {
              queryClient.setQueryData<StreakState | null>(streakQueryKey, res.streak);
            })
            .catch(() => { /* offline / 401 → server stays out of sync, no UI impact */ });
        }

        set({ answered: next, streak, lastCompletedDate, perfectDays });
      },

      hasCompletedToday: () => {
        const { answered } = get();
        return answered[0] !== null && answered[1] !== null;
      },

      claimRegularChest: () => {
        const state = get();
        if (state.regularChestOpened) return null;
        if (!state.hasCompletedToday()) return null;

        const perfect = state.todayPerfect();
        const reward = previewRegularReward(state.streak, perfect);
        const economy = useEconomyUIStore.getState();
        economy.addXP(reward.xp, 'daily_task');
        economy.addCoins(reward.coins, 'quiz');
        // gems handled by economy store if supported; safe-call avoids crash.
        const addGems = (economy as unknown as { addGems?: (n: number) => void }).addGems;
        if (typeof addGems === 'function' && reward.gems > 0) addGems(reward.gems);

        set({ regularChestOpened: true });
        return reward;
      },

      claimProChest: () => {
        const state = get();
        if (state.proChestOpened) return null;
        if (!state.hasCompletedToday()) return null;

        // Caller (UI) is responsible for gating on isPro(). Store grants
        // unconditionally — same posture as useDailyQuestsStore.
        const perfect = state.todayPerfect();
        const reward = previewProReward(state.streak, perfect);
        const economy = useEconomyUIStore.getState();
        economy.addXP(reward.xp, 'daily_task');
        economy.addCoins(reward.coins, 'quiz');
        const addGems = (economy as unknown as { addGems?: (n: number) => void }).addGems;
        if (typeof addGems === 'function' && reward.gems > 0) addGems(reward.gems);

        set({ proChestOpened: true });
        return reward;
      },
    }),
    {
      name: 'daily-news-challenge-store',
      storage: createJSONStorage(() => zustandStorage),
      version: 3,
      partialize: (state) => ({
        todayChallenge: state.todayChallenge,
        cachedFor: state.cachedFor,
        answered: state.answered,
        regularChestOpened: state.regularChestOpened,
        proChestOpened: state.proChestOpened,
        streak: state.streak,
        lastCompletedDate: state.lastCompletedDate,
        perfectDays: state.perfectDays,
      }),
    },
  ),
);
