import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import { getIsraelDateISO, israelDatePlusDays } from '../../utils/israelTime';
import { generateChestDrop } from './chestDrops';
import type { ChestRarity } from './types';
import { useEconomyUIStore, deriveStreakFromDates } from '../economy/useEconomyUIStore';
import { useHeartsStore } from '../subscription/useHeartsStore';
import { track } from '../../lib/analytics/events';

/**
 * תיבת-המחר (Tomorrow Chest) — the day-2 appointment mechanic
 * (RETENTION-SPRINT 2026-07-06, approved by Yoav: "כן, תבצע כמו שצריך").
 *
 * Completing a module chest TODAY arms a sealed chest that opens on the NEXT
 * Israel calendar day. It makes the promises the app already ships literal:
 * the Day0ExitRitual says "מחר: יומיים ברצף ותיבה חדשה" and the fresh-grant
 * day-2 push says "התיבה של יום 2 מחכה" — this store is the actual chest
 * behind those words. Mechanic per Clash Royale / Duolingo appointment
 * rewards; sits on the mod-0-1-chest→D1 5.5x moment (chest-closers return
 * ~22% vs ~4%).
 *
 * Design rules (from the team synthesis):
 *  - Arming is EARNED: only a real chest open (module / welcome) arms
 *    tomorrow's chest. Opening the tomorrow-chest itself does NOT re-arm —
 *    the open→lesson→chest loop is what re-arms, keeping the mechanic
 *    anchored to learning, not to logins.
 *  - A ready-but-unopened chest is never overwritten by a new arm; a
 *    comeback after skipped days still finds it ready (no punishment).
 *  - Rewards ride the exact same pipes as module chests (addCoins 'lesson',
 *    addXP 'daily_task', grantEnergy 'chest'); gems are deliberately
 *    excluded (gem economy = מוני's domain; keep this out of monetization).
 *  - Analytics: fires `tomorrow_chest_opened`, NEVER `chest_opened` —
 *    chest_opened uniques ARE the learning-completion NSM
 *    (docs: chest_completion_metric); a daily return chest reusing it would
 *    silently inflate module-completion dashboards.
 *  - No in-chest-modal teaser: Yoav removed the "Captain's Forecast" tomorrow
 *    teaser from ChestCelebrationModal on 2026-06-11 ("cluttering the reward
 *    moment"). The visible artifact is the map card + the day-2 ceremony.
 */

/** Kill switch — flip to false (OTA) to fully disable arming, the map card
 *  and the day-2 ceremony. Already-armed state is simply ignored while off. */
export const TOMORROW_CHEST_ENABLED = true;

export interface TomorrowChestRewards {
  coins: number;
  xp: number;
  energy: number;
  rarity: ChestRarity;
}

/** Energy granted by the tomorrow chest — fuels the "ממשיכים מאיפה שעצרנו"
 *  CTA so the user can actually start the next lesson. Mirrors the module
 *  chest's CHEST_ENERGY_REWARD (topic-learning/types) without importing
 *  across features. */
const TOMORROW_CHEST_ENERGY = 2;

export type TomorrowChestStatus = 'none' | 'sealed' | 'ready';

/** Overnight-interest economics (מוני 8.7.26, approved by Yoav):
 *  the chest pays a FLOOR of 100 coins, plus a 50% match on the learning
 *  coins earned on the ARMING day (capped), framed as "הכסף שלך עובד
 *  בלילה" — returning tomorrow is the single best-paying decision of day-0,
 *  and it's a live compound-interest lesson. Max injection ≈ 300, one-shot,
 *  return-gated — less than one portfolio share. */
const CHEST_COINS_FLOOR = 100;
const OVERNIGHT_MATCH_RATE = 0.5;
const OVERNIGHT_MATCH_CAP = 200;
/** Day-after-day CHAIN (Yoav 11.7: "לשפר את החוויה בתיבת חזרה יום אחרי יום").
 *  Every consecutive-day open grows a visible chain and pays a small
 *  escalating bonus on top of the floor: +25 coins per chain day, capped at
 *  +150 (day 7). Miss a day → the chain resets to 1 (the chest itself never
 *  punishes — only the bonus resets). */
const CHAIN_BONUS_PER_DAY = 25;
const CHAIN_BONUS_CAP = 150;
/** armedSource used by the automatic post-open re-arm. A 'chain' arm pays
 *  floor+chain only — the overnight MATCH stays learning-earned: completing
 *  a real lesson chest the same day UPGRADES the arm (armForTomorrow swaps
 *  the source), unlocking the match. Login-alone keeps the appointment;
 *  learning makes it pay. */
export const CHAIN_ARM_SOURCE = 'chain';
/** Ready window in days: opens-day + this many extra days, then it EXPIRES
 *  ("לא נאסף — נשרף", מוני 8.7): urgency without a streak punishment. An
 *  expired chest never blocks re-arming — the next real chest re-arms fresh. */
const READY_WINDOW_DAYS = 1;

/** Pure status derivation. ISO date strings compare lexicographically. */
export function tomorrowChestStatus(opensOnDate: string | null, todayIL: string = getIsraelDateISO()): TomorrowChestStatus {
  if (!TOMORROW_CHEST_ENABLED || !opensOnDate) return 'none';
  if (todayIL < opensOnDate) return 'sealed';
  // Expired (48h window passed) reads as 'none' — the card/ceremony vanish.
  if (todayIL > israelDatePlusDays(opensOnDate, READY_WINDOW_DAYS)) return 'none';
  return 'ready';
}

/** Whole-day gap between two IL-ISO dates (UTC-noon anchored, DST-safe). */
function dayGap(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T12:00:00Z`).getTime();
  const to = new Date(`${toISO}T12:00:00Z`).getTime();
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

interface TomorrowChestState {
  /** IL-ISO date the sealed chest becomes ready (null = not armed). */
  opensOnDate: string | null;
  /** IL-ISO date it was armed — day_gap analytics + "which activity earned it". */
  armedOnDate: string | null;
  armedSource: string | null;
  /** IL-ISO date of the last open (analytics / debugging). */
  lastOpenedOnDate: string | null;
  totalOpens: number;
  /** Day-after-day chain: how many CONSECUTIVE IL days the chest was opened.
   *  1 on the first open, +1 per next-day open, reset to 1 after a gap. */
  consecutiveOpenDays: number;
  /** Transient nonce — the map card requests the ceremony via bump;
   *  TomorrowChestReadyHost subscribes. NOT persisted. */
  openRequestNonce: number;

  /** Arm the chest for tomorrow (IL). Idempotent per day; never overwrites a
   *  ready-but-unopened chest. Returns true only when a NEW arm happened. */
  armForTomorrow: (source: string) => boolean;
  /** Map-card tap → ask the host to run the ceremony now. */
  requestOpen: () => void;
  /** Open a READY chest: rolls the drop, grants rewards, clears the arm.
   *  Returns the granted rewards, or null when not ready (double-tap safe). */
  openReadyChest: () => TomorrowChestRewards | null;
  reset: () => void;
}

export const useTomorrowChestStore = create<TomorrowChestState>()(
  persist(
    (set, get) => ({
      opensOnDate: null,
      armedOnDate: null,
      armedSource: null,
      lastOpenedOnDate: null,
      totalOpens: 0,
      consecutiveOpenDays: 0,
      openRequestNonce: 0,

      armForTomorrow: (source: string): boolean => {
        if (!TOMORROW_CHEST_ENABLED) return false;
        const today = getIsraelDateISO();
        const tomorrow = israelDatePlusDays(today, 1);
        const { opensOnDate, armedOnDate } = get();
        if (opensOnDate !== null) {
          const expired = today > israelDatePlusDays(opensOnDate, READY_WINDOW_DAYS);
          if (expired) {
            // Burned unclaimed (מוני 8.7) — log once, then fall through to a
            // fresh arm; an expired chest must never block the loop.
            try {
              track({ name: 'tomorrow_chest_expired', props: { opens_on: opensOnDate, armed_on: armedOnDate ?? 'unknown' } });
            } catch { /* non-fatal */ }
          } else {
            // Ready-but-unopened (inside the window) — never steal it by
            // re-arming; they open first, the next chest re-arms.
            if (opensOnDate <= today) return false;
            // Already armed for tomorrow — idempotent, EXCEPT the learning
            // upgrade: a 'chain' auto-arm (post-open) is floor-only; a real
            // chest the same day swaps the source so tomorrow's chest also
            // pays the overnight match on today's learning coins.
            if (opensOnDate === tomorrow) {
              const { armedSource: currentSource } = get();
              if (currentSource === CHAIN_ARM_SOURCE && source !== CHAIN_ARM_SOURCE) {
                set({ armedSource: source });
                try { track({ name: 'tomorrow_chest_armed', props: { source: `upgrade:${source}`, opens_on: tomorrow } }); } catch { /* non-fatal */ }
              }
              return false;
            }
          }
        }
        set({ opensOnDate: tomorrow, armedOnDate: today, armedSource: source });
        try { track({ name: 'tomorrow_chest_armed', props: { source, opens_on: tomorrow } }); } catch { /* non-fatal */ }
        return true;
      },

      requestOpen: () => set({ openRequestNonce: get().openRequestNonce + 1 }),

      openReadyChest: (): TomorrowChestRewards | null => {
        const { opensOnDate, armedOnDate, armedSource, totalOpens, lastOpenedOnDate, consecutiveOpenDays } = get();
        const today = getIsraelDateISO();
        if (tomorrowChestStatus(opensOnDate, today) !== 'ready') return null;

        // Same streak multiplier as module chests; gems intentionally zeroed.
        const eco = useEconomyUIStore.getState();
        const streak = deriveStreakFromDates(eco.activeDates, eco.frozenDates);
        const drop = generateChestDrop('regular', streak);
        // Overnight interest (מוני 8.7): floor 100 + 50% match on the ARMING
        // day's learning coins (capped 200). The match reads the real per-day
        // ledger — never an invented number; no learning yesterday = no match.
        // CHAIN arms (post-open auto re-arm) are match-INELIGIBLE — otherwise
        // yesterday's chest coins would compound into today's match forever.
        // A same-day lesson chest upgrades the source (see armForTomorrow) and
        // restores eligibility — the interest stays a LEARNING reward.
        const matchEligible = armedSource !== CHAIN_ARM_SOURCE;
        const earnedOnArmDay = matchEligible && armedOnDate ? (eco.coinsEarnedByDay[armedOnDate] ?? 0) : 0;
        const matchCoins = Math.min(OVERNIGHT_MATCH_CAP, Math.floor(earnedOnArmDay * OVERNIGHT_MATCH_RATE));
        // Day-after-day chain (Yoav 11.7): opened yesterday too → chain grows;
        // any gap → chain restarts at 1. Escalating bonus, capped.
        const chainDay = lastOpenedOnDate === israelDatePlusDays(today, -1)
          ? Math.max(1, consecutiveOpenDays) + 1
          : 1;
        const chainBonus = Math.min(CHAIN_BONUS_CAP, (chainDay - 1) * CHAIN_BONUS_PER_DAY);
        // First-ever open: guarantee a rare-or-better FEEL (raise the floor,
        // never the ceiling — one-shot, no inflation).
        const rarity = totalOpens === 0 && drop.rarity === 'common' ? 'rare' : drop.rarity;
        const rewards: TomorrowChestRewards = {
          coins: Math.max(CHEST_COINS_FLOOR, drop.rewards.coins) + matchCoins + chainBonus,
          xp: drop.rewards.xp,
          energy: TOMORROW_CHEST_ENERGY,
          rarity,
        };

        // Clear the arm FIRST (double-tap / re-entry safe), then grant.
        set({
          opensOnDate: null,
          armedOnDate: null,
          armedSource: null,
          lastOpenedOnDate: today,
          totalOpens: totalOpens + 1,
          consecutiveOpenDays: chainDay,
        });

        eco.addCoins(rewards.coins, 'lesson');
        eco.addXP(rewards.xp, 'daily_task');
        try { useHeartsStore.getState().grantEnergy(rewards.energy, 'chest'); } catch { /* non-fatal */ }

        try {
          track({
            name: 'tomorrow_chest_opened',
            props: {
              day_gap: armedOnDate ? dayGap(armedOnDate, today) : 0,
              coins: rewards.coins,
              match_coins: matchCoins,
              xp: rewards.xp,
              rarity: rewards.rarity,
              armed_source: armedSource ?? 'unknown',
              chain_day: chainDay,
            },
          });
        } catch { /* non-fatal */ }

        // Day-after-day auto re-arm (Yoav 11.7): opening TODAY seals tomorrow's
        // chest immediately — the appointment loop never breaks silently. This
        // 'chain' arm pays floor+chain only; a real lesson chest later today
        // upgrades it to full overnight interest (armForTomorrow source swap).
        get().armForTomorrow(CHAIN_ARM_SOURCE);

        return rewards;
      },

      reset: () => set({
        opensOnDate: null,
        armedOnDate: null,
        armedSource: null,
        lastOpenedOnDate: null,
        totalOpens: 0,
        consecutiveOpenDays: 0,
        openRequestNonce: 0,
      }),
    }),
    {
      name: 'tomorrow-chest-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        opensOnDate: s.opensOnDate,
        armedOnDate: s.armedOnDate,
        armedSource: s.armedSource,
        lastOpenedOnDate: s.lastOpenedOnDate,
        totalOpens: s.totalOpens,
        consecutiveOpenDays: s.consecutiveOpenDays,
        // openRequestNonce deliberately NOT persisted — transient UI signal.
      }),
    },
  ),
);

registerLocalStore('tomorrow-chest-store', useTomorrowChestStore, 'tomorrow-chest-store');
