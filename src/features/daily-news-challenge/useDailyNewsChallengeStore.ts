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
import { queryClient } from '../../lib/queryClient';
import { streakQueryKey, markDailyActivityCompleted } from '../economy/useStreak';
import { useDailyQuestsStore } from '../daily-quests/useDailyQuestsStore';
import type { StreakState } from '../../lib/api/streak';
import type { DailyChallenge, ItemAnswer } from './types';

/** YYYY-MM-DD anchored to Asia/Jerusalem — same day boundary the server
 *  and the streak helpers (useEconomyUIStore.todayISO, useStreak.todayIsraelDate)
 *  use. Was UTC; drifted by a day for users outside UTC+2/+3 so a
 *  challenge cached "today" client-side wouldn't match a server "today"
 *  on the next fetch. */
const IL_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function todayKey(): string {
  return IL_DATE_FMT.format(new Date());
}

/** True if `b` is the calendar day right after `a` (UTC-day arithmetic). */
function isConsecutive(a: string, b: string): boolean {
  const dayA = new Date(`${a}T00:00:00Z`).getTime();
  const dayB = new Date(`${b}T00:00:00Z`).getTime();
  return dayB - dayA === 24 * 60 * 60 * 1000;
}

/**
 * Resolves the streak number to use for reward multipliers. Prefers the
 * unified global streak from the server (query cache, same value the
 * header counter shows), falls back to the legacy local DNC streak so
 * pre-update persisted state is honored for one transition cycle.
 */
function getEffectiveStreak(legacyLocal: number): number {
  try {
    const cached = queryClient.getQueryData<StreakState | null>(streakQueryKey);
    if (cached?.currentStreak && cached.currentStreak > 0) return cached.currentStreak;
  } catch { /* ignore */ }
  return legacyLocal ?? 0;
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
  /** Date-key of the most recent `news_challenge_completed` analytics event.
   *  Lives in persisted state so the guard survives sheet unmounts (the old
   *  useRef-based guard reset on every close → 58:2 over-fire bug). */
  lastCompletionEventDateKey: string | null;
  /** Returns true if this dateKey was already reported and shouldn't fire
   *  again. False means: caller should fire AND update via the setter. */
  hasReportedCompletionFor: (dateKey: string) => boolean;
  markCompletionReportedFor: (dateKey: string) => void;

  /* ─── actions ─── */
  setTodayChallenge: (challenge: DailyChallenge) => void;
  recordAnswer: (itemIdx: 0 | 1, selectedIdx: number, wasCorrect: boolean) => void;
  hasCompletedToday: () => boolean;
  claimRegularChest: () => ChallengeRewardSummary | null;
  claimProChest: () => ChallengeRewardSummary | null;
  /** Allow the user to re-experience today's news challenge after they've
   *  already completed it. Clears ONLY `answered` so the chips render again;
   *  keeps `regularChestOpened`/`proChestOpened` (no double payout),
   *  `lastCompletionEventDateKey` (no double analytics), and `perfectDays`
   *  (no double-count toward the perfect-day milestone). */
  resetTodayAnswers: () => void;
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
      lastCompletionEventDateKey: null,

      hasReportedCompletionFor: (dateKey) => {
        return get().lastCompletionEventDateKey === dateKey;
      },
      markCompletionReportedFor: (dateKey) => {
        if (get().lastCompletionEventDateKey === dateKey) return;
        set({ lastCompletionEventDateKey: dateKey });
      },

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

        // Track lastCompletedDate so claim flows know "today's done", and
        // perfectDays so the Pro chest can preview the "perfect" bonus.
        // The DNC-specific `streak` field is no longer authoritative — the
        // unified daily streak (useEconomyUIStore) is the source of truth.
        // Leave the persisted `streak` value alone on write so existing
        // active users don't see "streak 0" right after this update — the
        // value is now read-only legacy; reward calcs use the global streak.
        const bothAnswered = next[0] !== null && next[1] !== null;
        let { lastCompletedDate, perfectDays } = state;
        if (bothAnswered) {
          // Anchor completion to the REAL local day, not the (possibly stale)
          // challenge dateKey — so a same-day finish of a lagging challenge still
          // counts and increments the perfect-day tally (Yoav 2026-07-03).
          const today = todayKey();
          if (lastCompletedDate !== today) {
            lastCompletedDate = today;
            const bothCorrect = next[0]?.wasCorrect === true && next[1]?.wasCorrect === true;
            if (bothCorrect) perfectDays += 1;
          }
          // Pearl/lesson/tool/quest/DNC all go through the same helper so the
          // popup + activeDates calendar + server sync update once per day.
          markDailyActivityCompleted();
        }

        set({ answered: next, lastCompletedDate, perfectDays });

        // Push the news-quest completion into the daily-quests store the
        // same tick — otherwise the star on DuoLearnScreen only updates
        // on the next useFocusEffect tick (which doesn't fire when this
        // sheet was opened as a modal child of that screen). User report
        // 2026-06-05: "הוא מתמלא, פשוט לאט מדי, צריך מיידית".
        if (bothAnswered) {
          try { useDailyQuestsStore.getState().syncCompletions(); } catch { /* non-fatal */ }
        }
      },

      hasCompletedToday: () => {
        const { answered } = get();
        const a0 = answered[0];
        const a1 = answered[1];
        if (!a0 || !a1) return false;
        // "Done today" is decided by WHEN the user answered (real Asia/Jerusalem
        // day via the answeredAt timestamp), NOT by the challenge's own dateKey.
        // The served challenge can lag a day when today's row hasn't been
        // generated yet (today+api returns the latest ROW's dateKey), so the old
        // `cachedFor !== todayKey()` check returned false for a genuine same-day
        // completion — and the news daily-quest star never filled (Yoav
        // 2026-07-03). The timestamp check still rejects yesterday's persisted
        // answers on a cold start across midnight (the 2026-06-30 guard).
        const answeredAt = a1.answeredAt ?? a0.answeredAt;
        return !!answeredAt && IL_DATE_FMT.format(new Date(answeredAt)) === todayKey();
      },

      claimRegularChest: () => {
        const state = get();
        if (state.regularChestOpened) return null;
        if (!state.hasCompletedToday()) return null;

        const perfect = state.todayPerfect();
        // Use the global unified streak (preferring the freshest, the
        // economy UI store; falling back to server query cache; else the
        // legacy local field) so the reward multiplier always matches the
        // streak number the user sees in the header.
        const reward = previewRegularReward(getEffectiveStreak(state.streak), perfect);
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
        const reward = previewProReward(getEffectiveStreak(state.streak), perfect);
        const economy = useEconomyUIStore.getState();
        economy.addXP(reward.xp, 'daily_task');
        economy.addCoins(reward.coins, 'quiz');
        const addGems = (economy as unknown as { addGems?: (n: number) => void }).addGems;
        if (typeof addGems === 'function' && reward.gems > 0) addGems(reward.gems);

        set({ proChestOpened: true });
        return reward;
      },

      resetTodayAnswers: () => {
        // Re-do support: wipe the per-item answers so the chips render again.
        // Chests and analytics guards stay set — second pass yields no XP/coins/gems
        // and doesn't double-fire `news_challenge_completed`. perfectDays is also
        // preserved so re-answering wrong after a perfect doesn't lose the streak.
        set({ answered: [null, null] });
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
        lastCompletionEventDateKey: state.lastCompletionEventDateKey,
      }),
      onRehydrateStorage: () => () => {
        // Cold start on a NEW day: clear yesterday's per-day slice so the news
        // challenge — and its daily-quest star — read as not-done immediately,
        // before the fresh challenge is fetched (setTodayChallenge). Mirrors
        // the useDailyQuestsStore rehydration reset. 2026-06-30.
        setTimeout(() => {
          try {
            const s = useDailyNewsChallengeStore.getState();
            if (s.cachedFor && s.cachedFor !== todayKey()) {
              useDailyNewsChallengeStore.setState({
                answered: [null, null],
                regularChestOpened: false,
                proChestOpened: false,
              });
              try { useDailyQuestsStore.getState().refreshQuests(); } catch { /* non-fatal */ }
            }
          } catch { /* non-fatal */ }
        }, 0);
      },
    },
  ),
);
