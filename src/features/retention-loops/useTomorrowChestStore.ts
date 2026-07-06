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

/** Pure status derivation. ISO date strings compare lexicographically. */
export function tomorrowChestStatus(opensOnDate: string | null, todayIL: string = getIsraelDateISO()): TomorrowChestStatus {
  if (!TOMORROW_CHEST_ENABLED || !opensOnDate) return 'none';
  return todayIL >= opensOnDate ? 'ready' : 'sealed';
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
      openRequestNonce: 0,

      armForTomorrow: (source: string): boolean => {
        if (!TOMORROW_CHEST_ENABLED) return false;
        const today = getIsraelDateISO();
        const tomorrow = israelDatePlusDays(today, 1);
        const { opensOnDate } = get();
        if (opensOnDate !== null) {
          // Ready-but-unopened (user returned but hasn't opened yet) — never
          // steal it by re-arming; they open first, the next chest re-arms.
          if (opensOnDate <= today) return false;
          // Already armed for tomorrow — idempotent.
          if (opensOnDate === tomorrow) return false;
        }
        set({ opensOnDate: tomorrow, armedOnDate: today, armedSource: source });
        try { track({ name: 'tomorrow_chest_armed', props: { source, opens_on: tomorrow } }); } catch { /* non-fatal */ }
        return true;
      },

      requestOpen: () => set({ openRequestNonce: get().openRequestNonce + 1 }),

      openReadyChest: (): TomorrowChestRewards | null => {
        const { opensOnDate, armedOnDate, armedSource, totalOpens } = get();
        const today = getIsraelDateISO();
        if (tomorrowChestStatus(opensOnDate, today) !== 'ready') return null;

        // Same streak multiplier as module chests; gems intentionally zeroed.
        const eco = useEconomyUIStore.getState();
        const streak = deriveStreakFromDates(eco.activeDates, eco.frozenDates);
        const drop = generateChestDrop('regular', streak);
        const rewards: TomorrowChestRewards = {
          coins: drop.rewards.coins,
          xp: drop.rewards.xp,
          energy: TOMORROW_CHEST_ENERGY,
          rarity: drop.rarity,
        };

        // Clear the arm FIRST (double-tap / re-entry safe), then grant.
        set({
          opensOnDate: null,
          armedOnDate: null,
          armedSource: null,
          lastOpenedOnDate: today,
          totalOpens: totalOpens + 1,
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
              xp: rewards.xp,
              rarity: rewards.rarity,
              armed_source: armedSource ?? 'unknown',
            },
          });
        } catch { /* non-fatal */ }

        return rewards;
      },

      reset: () => set({
        opensOnDate: null,
        armedOnDate: null,
        armedSource: null,
        lastOpenedOnDate: null,
        totalOpens: 0,
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
        // openRequestNonce deliberately NOT persisted — transient UI signal.
      }),
    },
  ),
);

registerLocalStore('tomorrow-chest-store', useTomorrowChestStore, 'tomorrow-chest-store');
